odoo.define("pos_loyalty_refund.PosGlobalState", function (require) {
    "use strict";

    const models = require('point_of_sale.models');  // Cargamos el archivo models.js

    // Sobrescribir directamente el método getDefaultSearchDetails en el prototipo de PosGlobalState
    models.PosGlobalState.prototype.getDefaultSearchDetails = function () {
        return {
            fieldName: 'SIMPLIFIED_INVOICE',  // Cambiamos el campo predeterminado
            searchTerm: '',
        };
    };
});
