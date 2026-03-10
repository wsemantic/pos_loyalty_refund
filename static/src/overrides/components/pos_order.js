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
        const simplifiedInvoiceNumber =
            this.l10n_es_simplified_invoice_number ||
            json.l10n_es_simplified_invoice_number;
        const fallbackOrderRef = this.name || this.pos_reference || json.name || json.pos_reference;

        json.gift_card_code = this.gift_card_code;
        json.gift_card_balance = this.gift_card_balance;
        json.l10n_es_simplified_invoice_number = simplifiedInvoiceNumber;
        json.barcode_debug_fallback_ref = fallbackOrderRef;

        json.headerData = json.headerData || {};
        json.headerData.l10n_es_simplified_invoice_number = simplifiedInvoiceNumber;
        json.headerData.barcode_debug_fallback_ref = fallbackOrderRef;

        debugBarcode("export_for_printing payload", {
            order_uid: this.uid,
            order_server_id: this.server_id,
            simplifiedInvoiceNumber,
            fallbackOrderRef,
            headerData: json.headerData,
        });

        return json;
    },
});
