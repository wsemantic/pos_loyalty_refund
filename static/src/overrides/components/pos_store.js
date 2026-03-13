/** @odoo-module */

import { PosStore } from "@point_of_sale/app/store/pos_store";
import { patch } from "@web/core/utils/patch";

const POS_SIMPLIFIED_DEBUG = false;

function normalizeMany2oneId(value) {
    // In POS payloads, many2one can arrive either as `id` or as `[id, display_name]`.
    if (Array.isArray(value)) {
        return value[0] || false;
    }
    return value || false;
}

function debugSimplifiedPartner(...args) {
    if (POS_SIMPLIFIED_DEBUG) {
        console.log("[pos_loyalty_refund][simplified_partner]", ...args);
    }
}

patch(PosStore.prototype, {
    getReceiptHeaderData(order) {
        const result = super.getReceiptHeaderData(...arguments);
        // `this.config` is the frontend record of backend model `pos.config`.
        const posConfig = this.config;

        // Expose simplified partner id to receipt template (`props.data.*`).
        result.simplified_partner_id = normalizeMany2oneId(
            posConfig?.simplified_partner_id
        );

        // Extra safety: if order partner is the simplified partner, do not expose it
        // in receipt header data to prevent customer lines from rendering.
        const partner = order?.get_partner?.() || result.partner;
        if (partner?.id && partner.id === result.simplified_partner_id) {
            result.partner = false;
        }

        debugSimplifiedPartner("receipt_header_data", {
            order_uid: order?.uid,
            partner_id: partner?.id || false,
            simplified_partner_id: result.simplified_partner_id,
            customer_visible: Boolean(result.partner),
        });

        return result;
    },
});
