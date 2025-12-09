import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";
import { useErrorHandlers, useAsyncLockedMethod } from "@point_of_sale/app/utils/hooks";
import { onMounted } from "@odoo/owl";

patch(PaymentScreen.prototype, {
    setup() {
        super.setup(...arguments);
        // this.report = useService("report");
        this.validateOrderWithoutPrice = useAsyncLockedMethod(this.validateOrderWithoutPrice);
    },
    async validateOrderWithoutPrice(isForceValidate) {
        this.numberBuffer.capture();
        if (!this.check_cash_rounding_has_been_well_applied()) {
            return;
        }
        const linesToRemove = this.currentOrder.lines.filter((line) => {
            const rounding = line.product_id.uom_id.rounding;
            const decimals = Math.max(0, Math.ceil(-Math.log10(rounding)));
            return floatIsZero(line.qty, decimals);
        });
        for (const line of linesToRemove) {
            this.currentOrder.removeOrderline(line);
        }
        if (await this._isOrderValid(isForceValidate)) {
            // remove pending payments before finalizing the validation
            const toRemove = [];
            for (const line of this.paymentLines) {
                if (!line.is_done() || line.amount === 0) {
                    toRemove.push(line);
                }
            }

            for (const line of toRemove) {
                this.currentOrder.remove_paymentline(line);
            }
            await this._finalizeValidationWithoutPrice();
        }
    },
     async _finalizeValidation() {
        if (this.currentOrder.is_paid_with_cash() || this.currentOrder.get_change()) {
            this.hardwareProxy.openCashbox();
        }

        this.currentOrder.date_order = serializeDateTime(luxon.DateTime.now());
        for (const line of this.paymentLines) {
            if (!line.amount === 0) {
                this.currentOrder.remove_paymentline(line);
            }
        }

        this.pos.addPendingOrder([this.currentOrder.id]);
        this.currentOrder.state = "paid";

        this.env.services.ui.block();
        let syncOrderResult;
        try {
            // 1. Save order to server.
            syncOrderResult = await this.pos.syncAllOrders({ throw: true });
            if (!syncOrderResult) {
                return;
            }

            // 2. Invoice.
            if (this.shouldDownloadInvoice() && this.currentOrder.is_to_invoice()) {
                if (this.currentOrder.raw.account_move) {
                    await this.invoiceService.downloadPdf(this.currentOrder.raw.account_move);
                } else {
                    throw {
                        code: 401,
                        message: "Backend Invoice",
                        data: { order: this.currentOrder },
                    };
                }
            }
        } catch (error) {
            if (error instanceof ConnectionLostError) {
                this.afterOrderValidation();
                Promise.reject(error);
            } else if (error instanceof RPCError) {
                this.currentOrder.state = "draft";
                handleRPCError(error, this.dialog);
            } else {
                throw error;
            }
            return error;
        } finally {
            this.env.services.ui.unblock();
        }

        // 3. Post process.
        const postPushOrders = syncOrderResult.filter((order) => order.wait_for_push_order());
        if (postPushOrders.length > 0) {
            await this.postPushOrderResolve(postPushOrders.map((order) => order.id));
        }

        await this.afterOrderValidation(!!syncOrderResult && syncOrderResult.length > 0);
    },
    async _postPushOrderResolve(order, order_server_ids) {
        const res = await super._postPushOrderResolve(...arguments);
        let result = await this.rpc({
            model: 'pos.order',
            method: 'get_giftcard_lines',
            args: [order_server_ids],
            kwargs: { context: session.user_context },
        });
        if (Object.keys(result.updated_lines).length){
            for (const line of order.get_orderlines()) {
                if(this.env.pos.config.gift_card_product_id[0] == line.product.id) {
                    const gclines = Object.values(result.updated_lines).filter((value) => value.price.toFixed(2) === line.price.toFixed(2));
                    line.gift_card_code = gclines[0].gift_card_code
                    line.gift_card_balance = gclines[0].gift_card_balance
                }
            }
        }
        if (Object.keys(result.gc_reward_line).length){
            for (const line of order.get_orderlines()) {
                if(line.is_reward_line) {
                    const gclines = Object.values(result.gc_reward_line).filter((value) => value.price.toFixed(2) === line.price.toFixed(2));
                    if(gclines.length){
                        line.gift_card_code = gclines[0].gift_card_code
                        line.gift_card_balance = gclines[0].gift_card_balance
                    }
                }
            }
        }
        return res;
    }
});
