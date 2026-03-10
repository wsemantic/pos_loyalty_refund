/** @odoo-module */

import { onMounted, onPatched } from "@odoo/owl";
import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";
import { patch } from "@web/core/utils/patch";

const DEFAULT_RECEIPT_WIDTH = 300;

const pickSimplifiedInvoiceNumber = (sources) => {
    for (const value of sources) {
        if (value) {
            return value;
        }
    }
    return false;
};

patch(OrderReceipt.prototype, {
    setup() {
        super.setup(...arguments);
        const applyLayout = () => this._applyReceiptLayout();
        onMounted(applyLayout);
        onPatched(applyLayout);
    },

    get simplifiedInvoiceNumber() {
        const data = this.props?.data || {};
        const headerData = data.headerData || {};
        const receipt = this.receipt || data.receipt || {};
        return pickSimplifiedInvoiceNumber([
            data.l10n_es_simplified_invoice_number,
            data.l10n_es_unique_id,
            headerData.l10n_es_simplified_invoice_number,
            headerData.l10n_es_unique_id,
            receipt.l10n_es_simplified_invoice_number,
            receipt.l10n_es_unique_id,
        ]);
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
