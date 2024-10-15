odoo.define("pos_loyalty_refund.PosGlobalState", function (require) {
    "use strict";

    const PosModel = require("point_of_sale.models").PosModel;

    const CustomPosGlobalState = (PosModel) =>
        class extends PosModel {

            // Sobrescribimos el método para cambiar el campo preseleccionado
            getDefaultSearchDetails() {
                return {
                    fieldName: 'SIMPLIFIED_INVOICE',  // Cambiamos el campo predeterminado
                    searchTerm: '',
                };
            }
        };

    // Extender el modelo global del POS
    require('point_of_sale.models').PosModel = CustomPosGlobalState;
});
