import { _t } from "@web/core/l10n/translation";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { Component, useState } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { patch } from "@web/core/utils/patch";
import { useTrackedAsync } from "@point_of_sale/app/utils/hooks";


/**
 * Prevent refunding ewallet/gift card lines.
 */
patch(TicketScreen.prototype, {
    setup() {
        super.setup(...arguments);
        this.printer = useState(useService("printer"));
        this.doGiftPrint = useTrackedAsync((_selectedSyncedOrder) => this.printGift(_selectedSyncedOrder));
    },
    async printGift(order) {
        // await this.pos.printReceipt({ order: order });
        const result = await this.printer.print(
            OrderReceipt,
            {
                data: this.orderExportForPrinting(order),
                formatCurrency: this.env.utils.formatCurrency,
                basic_receipt: basic,
            },
            { webPrintFallback: true }
        );
        if (!printBillActionTriggered) {
            order.nb_print += 1;
            if (typeof order.id === "number" && result) {
                await this.data.write("pos.order", [order.id], { nb_print: order.nb_print });
            }
        }
        return true;
    }

});
