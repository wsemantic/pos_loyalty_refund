odoo.define("pos_loyalty_refund.PosGlobalState", function (require) {
    "use strict";

    const models = require('point_of_sale.models');  // Requiere el archivo models.js

    // Extender la clase PosGlobalState
    const CustomPosGlobalState = models.PosGlobalState.prototype.getDefaultSearchDetails;
    
    models.PosGlobalState = models.PosGlobalState.extend({

        // Sobrescribimos el método para cambiar el campo preseleccionado
        getDefaultSearchDetails() {
            return {
                fieldName: 'SIMPLIFIED_INVOICE',  // Cambiamos el campo predeterminado
                searchTerm: '',
            };
        }
    });
});
