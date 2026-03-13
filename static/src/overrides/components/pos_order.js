import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { patch } from "@web/core/utils/patch";

const POS_BARCODE_DEBUG = true;

const debugBarcode = (...args) => {
    if (POS_BARCODE_DEBUG) {
        console.log("[pos_loyalty_refund][barcode]", ...args);
    }
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

        // OCA ReceiptHeader may render partner.address in a dedicated line.
        // Clear it at payload level to keep receipts compact regardless of XML inherit order.
        if (json.partner && Object.prototype.hasOwnProperty.call(json.partner, "address")) {
            json.partner.address = false;
        }
        if (json.headerData.partner && Object.prototype.hasOwnProperty.call(json.headerData.partner, "address")) {
            json.headerData.partner.address = false;
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
