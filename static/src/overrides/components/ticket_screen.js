import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { patch } from "@web/core/utils/patch";
import { useTrackedAsync } from "@point_of_sale/app/utils/hooks";

const POS_BARCODE_DEBUG = true;

const debugBarcode = (...args) => {
    if (POS_BARCODE_DEBUG) {
        console.log("[pos_loyalty_refund][barcode]", ...args);
    }
};

patch(TicketScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.printer = useState(useService("printer"));
        this.orm = useService("orm");
        this.doGPrint = useTrackedAsync((_selectedSyncedOrder) => this.printG(_selectedSyncedOrder));
    },

    async printG(order) {
        debugBarcode("printG start", {
            server_id: order?.server_id,
            l10n_es_simplified_invoice_number: order?.l10n_es_simplified_invoice_number,
            name: order?.name,
            pos_reference: order?.pos_reference,
        });

        if (order && !order.l10n_es_simplified_invoice_number && order.server_id) {
            const [dbOrder] = await this.orm.read(
                "pos.order",
                [order.server_id],
                ["l10n_es_simplified_invoice_number", "name", "pos_reference"]
            );
            if (dbOrder?.l10n_es_simplified_invoice_number) {
                order.l10n_es_simplified_invoice_number = dbOrder.l10n_es_simplified_invoice_number;
            }
            debugBarcode("printG orm.read pos.order", dbOrder);
        }

        await this.pos.printReceipt({
            order: order,
            basic: true,
        });
    },
});
