import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { patch } from "@web/core/utils/patch";

const POS_BARCODE_DEBUG = true;

const debugBarcode = (...args) => {
    if (POS_BARCODE_DEBUG) {
        console.log("[pos_loyalty_refund][barcode]", ...args);
    }
};

const resolveId = (value) => {
    if (Array.isArray(value)) {
        return value[0];
    }
    if (value && typeof value === "object") {
        return value.id ?? value[0] ?? null;
    }
    return value ?? null;
};

patch(PosOrder.prototype, {
    export_for_printing(baseUrl, headerData) {
        const json = super.export_for_printing(...arguments);
        const uniqueId =
            this.l10n_es_unique_id ||
            json.l10n_es_unique_id;

        json.gift_card_code = this.gift_card_code;
        json.gift_card_balance = this.gift_card_balance;
        json.l10n_es_unique_id = uniqueId;

        json.headerData = json.headerData || {};
        json.headerData.l10n_es_unique_id = uniqueId;
        json.headerData.date = json.date;

        const partnerId =
            resolveId(json.partner_id) ??
            resolveId(json.partner?.id) ??
            resolveId(json.headerData.partner?.id);
        const simplifiedPartnerId =
            resolveId(json.simplified_partner_id) ??
            resolveId(json.headerData.simplified_partner_id) ??
            resolveId(this.pos?.config?.simplified_partner_id);

        if (partnerId != null && simplifiedPartnerId != null && `${partnerId}` === `${simplifiedPartnerId}`) {
            json.partner = null;
            if (json.headerData.partner) {
                json.headerData.partner = null;
            }
        }

        debugBarcode("export_for_printing payload", {
            order_uid: this.uid,
            order_server_id: this.server_id,
            uniqueId,
            headerData: json.headerData,
        });

        return json;
    },
});
