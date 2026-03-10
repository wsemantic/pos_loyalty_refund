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

        // Remove tracking reference and branded footer sentence when present.
        const removablePattern = /tracking|tecnolog[ií]a\s+odoo|technology\s+odoo/i;
        const removableNodes = Array.from(this.el.querySelectorAll("div, p, span, li"));
        for (const node of removableNodes) {
            const text = (node.textContent || "").trim();
            if (text && removablePattern.test(text)) {
                node.remove();
            }
        }

        // Move date next to simplified invoice number in the header area.
        const allNodes = Array.from(this.el.querySelectorAll("div, p, span, li"));
        const simplifiedInvoiceNode = allNodes.find((node) => {
            const text = (node.textContent || "").trim();
            return /factura\s+simplificada|simplified\s+invoice/i.test(text);
        });

        const dateNode = allNodes.find((node) => {
            const text = (node.textContent || "").trim();
            return /^(fecha|date)\b/i.test(text);
        });

        if (simplifiedInvoiceNode && dateNode && simplifiedInvoiceNode !== dateNode) {
            const existingWrapper = simplifiedInvoiceNode.closest(".wsem-simplified-invoice-meta");
            if (existingWrapper) {
                existingWrapper.appendChild(dateNode);
            } else {
                const wrapper = document.createElement("div");
                wrapper.className = "wsem-simplified-invoice-meta";
                simplifiedInvoiceNode.parentNode?.insertBefore(wrapper, simplifiedInvoiceNode);
                wrapper.appendChild(simplifiedInvoiceNode);
                wrapper.appendChild(dateNode);
            }
        }
    },
});
