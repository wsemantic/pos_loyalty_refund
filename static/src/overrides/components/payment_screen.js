/** @odoo-module */

import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { patch } from "@web/core/utils/patch";

patch(PaymentScreen.prototype, {
    async validateOrder(isForceValidate, basicReceipt = false) {
        if (!this.currentOrder) return;
        if (basicReceipt) {
            this.currentOrder.uiState.printBasicReceipt = true;
        }
        try {
            await super.validateOrder(isForceValidate);
        } finally {
            if (basicReceipt && this.currentOrder) {
                this.currentOrder.uiState.printBasicReceipt = false;
            }
        }
    },
    async afterOrderValidation(suggestToPrint = true) {
        if (this.currentOrder && this.currentOrder.uiState.printBasicReceipt) {
            const originalPrintReceipt = this.pos.printReceipt;
            this.pos.printReceipt = async (options = {}) => {
                // 1. Print Basic Receipt
                const result = await originalPrintReceipt.call(this.pos, { ...options, basic: true });

                // 2. Print Full Receipt (if enabled)
                if (this.pos.config.enable_second_print_with_price) {
                    await originalPrintReceipt.call(this.pos, { ...options, basic: false });
                }
                return result;
            };
            try {
                await super.afterOrderValidation(suggestToPrint);
            } finally {
                this.pos.printReceipt = originalPrintReceipt;
            }
        } else {
            await super.afterOrderValidation(suggestToPrint);
        }
    },
    async _postPushOrderResolve(order, order_server_ids) {
        const result = await super._postPushOrderResolve(...arguments);
        try {
            if (order_server_ids && order_server_ids.length > 0) {
                const giftCardData = await this.env.services.orm.call("pos.order", "get_giftcard_lines", [order_server_ids]);

                if (giftCardData && giftCardData.updated_lines) {
                    for (const [lineId, data] of Object.entries(giftCardData.updated_lines)) {
                        // lineId comes as string from keys
                        const line = order.lines.find(l => l.server_id == lineId || l.id == lineId);
                        if (line) {
                            line.gift_card_id = {
                                id: data.gift_card_id,
                                code: data.gift_card_code,
                                points: data.gift_card_balance
                            };
                        }
                    }
                }
            }
        } catch (error) {
            console.error("Error fetching gift card lines in _postPushOrderResolve:", error);
            // We do not throw here to allow the flow to continue
        }
        return result;
    }
});
