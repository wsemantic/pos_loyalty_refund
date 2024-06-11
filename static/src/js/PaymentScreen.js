odoo.define('pos_loyalty_refund.PaymentScreen', function (require) {
    "use strict";

    const PaymentScreen = require('point_of_sale.PaymentScreen');
    const Registries = require('point_of_sale.Registries');
    const { useListener } = require("@web/core/utils/hooks");
    const { useErrorHandlers, useAsyncLockedMethod } = require('point_of_sale.custom_hooks');

    const session = require('web.session');
    
    const PosGCPaymentScreen = PaymentScreen => class extends PaymentScreen {
        setup() {
            super.setup();
            useListener('validate-order-without-price', () => this.validateOrderWithoutPrice(false));
            this.validateOrderWithoutPrice = useAsyncLockedMethod(this.validateOrderWithoutPrice);
        }
        async validateOrderWithoutPrice(isForceValidate) {
            if(this.env.pos.config.cash_rounding) {
                if(!this.env.pos.get_order().check_paymentlines_rounding()) {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Rounding error in payment lines'),
                        body: this.env._t("The amount of your payment lines must be rounded to validate the transaction."),
                    });
                    return;
                }
            }
            if (await this._isOrderValid(isForceValidate)) {
                // remove pending payments before finalizing the validation
                for (let line of this.paymentLines) {
                    if (!line.is_done()) this.currentOrder.remove_paymentline(line);
                }
                await this._finalizeValidationWithoutPrice();
            }
        }
        async _finalizeValidationWithoutPrice() {
            if ((this.currentOrder.is_paid_with_cash() || this.currentOrder.get_change()) && this.env.pos.config.iface_cashdrawer && this.env.proxy && this.env.proxy.printer) {
                this.env.proxy.printer.open_cashbox();
            }

            this.currentOrder.initialize_validation_date();
            for (let line of this.paymentLines) {
                if (!line.amount === 0) {
                     this.currentOrder.remove_paymentline(line);
                }
            }
            this.currentOrder.finalized = true;

            let syncOrderResult, hasError;

            try {
                this.env.services.ui.block()
                // 1. Save order to server.
                syncOrderResult = await this.env.pos.push_single_order(this.currentOrder);

                // 2. Invoice.
                if (this.shouldDownloadInvoice() && this.currentOrder.is_to_invoice()) {
                    if (syncOrderResult.length) {
                        await this.env.legacyActionManager.do_action(this.env.pos.invoiceReportAction, {
                            additional_context: {
                                active_ids: [syncOrderResult[0].account_move],
                            },
                        });
                    } else {
                        throw { code: 401, message: 'Backend Invoice', data: { order: this.currentOrder } };
                    }
                }

                // 3. Post process.
                if (syncOrderResult.length && this.currentOrder.wait_for_push_order()) {
                    const postPushResult = await this._postPushOrderResolve(
                        this.currentOrder,
                        syncOrderResult.map((res) => res.id)
                    );
                    if (!postPushResult) {
                        this.showPopup('ErrorPopup', {
                            title: this.env._t('Error: no internet connection.'),
                            body: this.env._t('Some, if not all, post-processing after syncing order failed.'),
                        });
                    }
                }
            } catch (error) {
                // unblock the UI before showing the error popup
                this.env.services.ui.unblock();
                if (error.code == 700 || error.code == 701)
                    this.error = true;

                if ('code' in error) {
                    // We started putting `code` in the rejected object for invoicing error.
                    // We can continue with that convention such that when the error has `code`,
                    // then it is an error when invoicing. Besides, _handlePushOrderError was
                    // introduce to handle invoicing error logic.
                    await this._handlePushOrderError(error);
                } else {
                    // We don't block for connection error. But we rethrow for any other errors.
                    if (isConnectionError(error)) {
                        this.showPopup('OfflineErrorPopup', {
                            title: this.env._t('Connection Error'),
                            body: this.env._t('Order is not synced. Check your internet connection'),
                        });
                    } else {
                        throw error;
                    }
                }
            } finally {
                this.env.services.ui.unblock()
                // Always show the next screen regardless of error since pos has to
                // continue working even offline.
                this.showScreen(this.nextScreen, {receiptWithoutPrice: true});
                // Remove the order from the local storage so that when we refresh the page, the order
                // won't be there
                this.env.pos.db.remove_unpaid_order(this.currentOrder);

                // Ask the user to sync the remaining unsynced orders.
                if (!hasError && syncOrderResult && this.env.pos.db.get_orders().length) {
                    const { confirmed } = await this.showPopup('ConfirmPopup', {
                        title: this.env._t('Remaining unsynced orders'),
                        body: this.env._t(
                            'There are unsynced orders. Do you want to sync these orders?'
                        ),
                    });
                    if (confirmed) {
                        // NOTE: Not yet sure if this should be awaited or not.
                        // If awaited, some operations like changing screen
                        // might not work.
                        this.env.pos.push_orders();
                    }
                }
            }
        }
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
                        const gclines = Object.values(result.updated_lines).filter((value) => value.price === line.price);
                        line.gift_card_code = gclines[0].gift_card_code
                        line.gift_card_balance = gclines[0].gift_card_balance
                    }
                }
            }
            return res;
        }
    };

    Registries.Component.extend(PaymentScreen, PosGCPaymentScreen);

    return PosGCPaymentScreen;
});