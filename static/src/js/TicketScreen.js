odoo.define("mi_modulo_a_medida.TicketScreen", function (require) {
    "use strict";

    const TicketScreen = require("point_of_sale.TicketScreen");
    const Registries = require("point_of_sale.Registries");

    const CustomTicketScreen = (TicketScreen) =>
        class extends TicketScreen {
            _getSearchFields() {
                const fields = super._getSearchFields();

                // Cambiar la prioridad del campo de factura simplificada para que sea el primero
                const simplifiedInvoiceField = {
                    SIMPLIFIED_INVOICE: {
                        repr: (order) => order.l10n_es_unique_id,
                        displayName: this.env._t("Simplified Invoice"),
                        modelField: "l10n_es_unique_id",
                    },
                };

                // Retornamos los campos de búsqueda, insertando primero el de Factura Simplificada
                return Object.assign(simplifiedInvoiceField, fields);
            }
        };

    Registries.Component.extend(TicketScreen, CustomTicketScreen);
    return TicketScreen;
});
