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

        // Global variable consumed by stylesheet in both screen and print contexts.
        document.documentElement.style.setProperty("--wsem-pos-receipt-width", widthPx);

        // Keep this limited to the receipt root element only.
        // Avoid traversing parent containers to prevent null container issues on reprints.
        if (this.el instanceof HTMLElement) {
            this.el.style.width = widthPx;
            this.el.style.maxWidth = widthPx;
        }
    },
});
