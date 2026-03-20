import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";
import { useTrackedAsync } from "@point_of_sale/app/utils/hooks";

const POS_BARCODE_DEBUG = true;

const debugBarcode = (...args) => {
    if (POS_BARCODE_DEBUG) {
        console.log("[pos_loyalty_refund][barcode]", ...args);
    }
};

patch(TicketScreen.prototype, {
    _getSearchFields() {
        // Adaptation of Odoo TicketScreen search fields:
        // addons/point_of_sale/static/src/app/screens/ticket_screen/ticket_screen.js
        // Extended alongside OCA l10n_es_pos_oca search field injection:
        // addons/l10n_es_pos_oca/static/src/app/screens/ticket_screen/ticket_screen.esm.js
        const fields = super._getSearchFields(...arguments);
        const simplifiedInvoiceField = Object.entries(fields).find(
            ([key, value]) => key === "SIMPLIFIED_INVOICE" || value?.modelField === "l10n_es_unique_id"
        );
        if (!simplifiedInvoiceField) {
            return {
                SIMPLIFIED_INVOICE: {
                    repr: (order) => order.get_l10n_es_unique_id?.() || order.l10n_es_unique_id || "",
                    displayName: _t("Simplified Invoice"),
                    modelField: "l10n_es_unique_id",
                },
                ...fields,
            };
        }
        const [simplifiedKey, simplifiedValue] = simplifiedInvoiceField;
        const remainingFields = Object.fromEntries(
            Object.entries(fields).filter(([key]) => key !== simplifiedKey)
        );
        return {
            [simplifiedKey]: {
                ...simplifiedValue,
                repr: (order) => order.get_l10n_es_unique_id?.() || order.l10n_es_unique_id || "",
                displayName: simplifiedValue.displayName || _t("Simplified Invoice"),
                modelField: "l10n_es_unique_id",
            },
            ...remainingFields,
        };
    },

    setup() {
        super.setup(...arguments);
        this.printer = useState(useService("printer"));
        this.orm = useService("orm");
        this.doGPrint = useTrackedAsync((_selectedSyncedOrder) => this.printG(_selectedSyncedOrder));

        const simplifiedSearchFieldName = Object.entries(this._getSearchFields()).find(
            ([key, value]) => key === "SIMPLIFIED_INVOICE" || value?.modelField === "l10n_es_unique_id"
        )?.[0];
        if (simplifiedSearchFieldName) {
            if (this.searchDetails && (!this.searchDetails.fieldName || this.searchDetails.fieldName === "RECEIPT_NUMBER")) {
                this.searchDetails.fieldName = simplifiedSearchFieldName;
            }
            if (this.state?.search && (!this.state.search.fieldName || this.state.search.fieldName === "RECEIPT_NUMBER")) {
                this.state.search.fieldName = simplifiedSearchFieldName;
            }
        }
    },

    async printG(order) {
        // Adaptation of Odoo TicketScreen printing flow:
        // addons/point_of_sale/static/src/app/screens/ticket_screen/ticket_screen.js
        debugBarcode("printG start", {
            server_id: order?.server_id,
            l10n_es_unique_id: order?.l10n_es_unique_id,
            name: order?.name,
            pos_reference: order?.pos_reference,
        });

        if (order && !order.l10n_es_unique_id && order.server_id) {
            const [dbOrder] = await this.orm.read(
                "pos.order",
                [order.server_id],
                ["l10n_es_unique_id", "name", "pos_reference"]
            );
            if (dbOrder?.l10n_es_unique_id) {
                order.l10n_es_unique_id = dbOrder.l10n_es_unique_id;
            }
            debugBarcode("printG orm.read pos.order", dbOrder);
        }

        await this.pos.printReceipt({
            order: order,
            basic: true,
        });
    },
});
