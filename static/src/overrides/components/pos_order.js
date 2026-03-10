import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { patch } from "@web/core/utils/patch";

patch(PosOrder.prototype, {
    export_for_printing(baseUrl, headerData) {
        const json = super.export_for_printing(...arguments);
        const simplifiedInvoiceNumber =
            this.l10n_es_simplified_invoice_number ||
            this.l10n_es_unique_id ||
            json.l10n_es_simplified_invoice_number ||
            json.l10n_es_unique_id;

        json.gift_card_code = this.gift_card_code;
        json.gift_card_balance = this.gift_card_balance;
        json.l10n_es_simplified_invoice_number = simplifiedInvoiceNumber;
        json.l10n_es_unique_id = simplifiedInvoiceNumber;

        json.headerData = json.headerData || {};
        json.headerData.l10n_es_simplified_invoice_number = simplifiedInvoiceNumber;
        json.headerData.l10n_es_unique_id = simplifiedInvoiceNumber;

        return json;
    },
});
