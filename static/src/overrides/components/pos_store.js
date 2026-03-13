/** @odoo-module */

import { PosStore } from "@point_of_sale/app/store/pos_store";
import { patch } from "@web/core/utils/patch";

function normalizeMany2oneId(value) {
    // In POS payloads, many2one can arrive either as `id` or as `[id, display_name]`.
    if (Array.isArray(value)) {
        return value[0] || false;
    }
    return value || false;
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

        return result;
    },
});
