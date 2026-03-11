/** @odoo-module */

import { onMounted, onPatched } from "@odoo/owl";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { patch } from "@web/core/utils/patch";

const DEFAULT_RECEIPT_WIDTH = 300;

patch(OrderReceipt.prototype, {
    setup() {
        super.setup(...arguments);
        const applyLayout = () => {
            this._applyReceiptLayout();
        };
        onMounted(applyLayout);
        onPatched(applyLayout);
    },

    _applyReceiptLayout() {
        const posService = this.env?.services?.pos || this.env?.pos;
        const configuredWidth = Number(posService?.config?.receipt_width);
        const receiptWidth = Number.isFinite(configuredWidth) && configuredWidth > 0
            ? configuredWidth
            : DEFAULT_RECEIPT_WIDTH;
        const widthPx = `${receiptWidth}px`;

        // Global variable consumed by stylesheet in both screen and print contexts.
        document.documentElement.style.setProperty("--wsem-pos-receipt-width", widthPx);

        if (this.el instanceof HTMLElement) {
            this.el.style.width = widthPx;
            this.el.style.maxWidth = widthPx;
        }
    },
});
