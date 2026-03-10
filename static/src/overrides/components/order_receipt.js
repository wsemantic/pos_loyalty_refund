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
            this._cleanupReceiptNoise();
        };
        onMounted(applyLayout);
        onPatched(applyLayout);
    },

    _applyReceiptLayout() {
        const receiptWidth = this.pos?.config?.receipt_width || DEFAULT_RECEIPT_WIDTH;
        const widthPx = `${receiptWidth}px`;

        // Global variable consumed by stylesheet in both screen and print contexts.
        document.documentElement.style.setProperty("--wsem-pos-receipt-width", widthPx);

        if (this.el instanceof HTMLElement) {
            this.el.style.width = widthPx;
            this.el.style.maxWidth = widthPx;
        }
    },

    _cleanupReceiptNoise() {
        if (!(this.el instanceof HTMLElement)) {
            return;
        }

        // Remove numeric-only line shown right after "Servido por ..." when present.
        const headerNodes = Array.from(this.el.querySelectorAll("div, p"));
        for (const node of headerNodes) {
            const text = (node.textContent || "").trim();
            if (!/^servido por/i.test(text)) {
                continue;
            }
            const next = node.nextElementSibling;
            if (next && /^\d{1,6}$/.test((next.textContent || "").trim())) {
                next.remove();
            }
        }

        // Remove explicit tracking number row in header when available.
        const trackingNumberNode = this.el.querySelector(".tracking-number");
        trackingNumberNode?.closest("div")?.remove();

        // Remove branded footer and POS order reference lines from the bottom block.
        const removablePattern = /tecnolog[ií]a(\s+de)?\s+odoo|technology\s+of\s+odoo|^pedido\b|^order\b/i;
        const removableNodes = Array.from(this.el.querySelectorAll(".pos-receipt-order-data div, .pos-receipt-order-data p"));
        for (const node of removableNodes) {
            const text = (node.textContent || "").trim();
            if (text && removablePattern.test(text)) {
                node.remove();
            }
        }

        // Move receipt date to header right after simplified invoice number.
        const simplifiedInvoiceNumberNode = this.el.querySelector(".simplified-invoice-number");
        const dateNode = this.el.querySelector("#order-date") || Array.from(this.el.querySelectorAll(".pos-receipt-order-data div, .pos-receipt-order-data p")).find((node) => {
            const text = (node.textContent || "").trim();
            return /^(fecha|date)\b|\d{1,2}\/\d{1,2}\/\d{2,4}/i.test(text);
        });

        if (simplifiedInvoiceNumberNode && dateNode) {
            dateNode.classList.add("wsem-header-order-date");
            simplifiedInvoiceNumberNode.insertAdjacentElement("afterend", dateNode);
        }
    },
});
