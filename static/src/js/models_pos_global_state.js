odoo.define("pos_loyalty_refund.PosGlobalState", function (require) {
    "use strict";

    const PosGlobalState = require('point_of_sale.models').PosGlobalState;
    const models = require('point_of_sale.models');

    const CustomPosGlobalState = (PosGlobalState) =>
        class extends PosGlobalState {

            // Sobrescribimos el método para cambiar el campo preseleccionado
            getDefaultSearchDetails() {
                return {
                    fieldName: 'SIMPLIFIED_INVOICE',  // Cambiamos el campo predeterminado
                    searchTerm: '',
                };
            }
        };

    models.PosGlobalState = CustomPosGlobalState(PosGlobalState);
});
