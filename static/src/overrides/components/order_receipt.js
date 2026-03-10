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

        // Remove tracking number field shown in shipping labels.
        this.el.querySelectorAll(".tracking-number").forEach((node) => node.remove());

        // Remove empty placeholder node rendered as "()" after city.
        this.el.querySelectorAll("div, p, span").forEach((node) => {
            if ((node.textContent || "").trim() === "()") {
                node.remove();
            }
        });

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

    },
});
