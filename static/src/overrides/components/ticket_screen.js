import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { patch } from "@web/core/utils/patch";
import { useTrackedAsync } from "@point_of_sale/app/utils/hooks";

patch(TicketScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.printer = useState(useService("printer"));
        this.orm = useService("orm");
        this.doGPrint = useTrackedAsync((_selectedSyncedOrder) => this.printG(_selectedSyncedOrder));
    },

    async printG(order) {
        if (order && !order.l10n_es_simplified_invoice_number && order.server_id) {
            const [dbOrder] = await this.orm.read(
                "pos.order",
                [order.server_id],
                ["l10n_es_simplified_invoice_number", "l10n_es_unique_id"]
            );
            const simplifiedInvoiceNumber = dbOrder?.l10n_es_simplified_invoice_number || dbOrder?.l10n_es_unique_id;
            if (simplifiedInvoiceNumber) {
                order.l10n_es_simplified_invoice_number = simplifiedInvoiceNumber;
                order.l10n_es_unique_id = simplifiedInvoiceNumber;
            }
        }
        await this.pos.printReceipt({
            order: order,
            basic: true,
        });
    },
});
