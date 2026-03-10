/** @odoo-module */

import { onMounted, onPatched } from "@odoo/owl";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { patch } from "@web/core/utils/patch";

const DEFAULT_RECEIPT_WIDTH = 300;

patch(OrderReceipt.prototype, {
    setup() {
        super.setup(...arguments);
        const applyLayout = () => this._applyReceiptLayout();
        onMounted(applyLayout);
        onPatched(applyLayout);
    },

    _applyReceiptLayout() {
        const receiptWidth = this.pos?.config?.receipt_width || DEFAULT_RECEIPT_WIDTH;
        const widthPx = `${receiptWidth}px`;

        // CSS variable consumed by the stylesheet for both on-screen and printer output.
        document.documentElement.style.setProperty("--wsem-pos-receipt-width", widthPx);

        // Force current receipt node width to avoid scaling in browser-based printing.
        if (this.el) {
            this.el.style.width = widthPx;
            this.el.style.maxWidth = widthPx;
        }

        const container = this.el?.closest(".pos-receipt-container");
        if (container) {
            container.style.width = widthPx;
            container.style.maxWidth = widthPx;
        }
    },
});
