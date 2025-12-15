import { _t } from "@web/core/l10n/translation";
import { TicketScreen } from "@point_of_sale/app/screens/ticket_screen/ticket_screen";
import { Component, useState } from "@odoo/owl";
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
        await this.pos.printReceipt({
            order: order,
            basic: true
        });
    },

});
