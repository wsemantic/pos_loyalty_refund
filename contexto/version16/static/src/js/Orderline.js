odoo.define('pos_loyalty_refund.Orderline', function(require) {
    'use strict';

    const Registries = require('point_of_sale.Registries');
    var { PosGlobalState, Order, Orderline } = require('point_of_sale.models');

    const PosLoyaltyOrderline = (Orderline) => class PosLoyaltyOrderline extends Orderline {
        constructor(obj, options) {
            super(...arguments);
            this.gift_card_code = this.gift_card_code || options.gift_card_code;
            this.gift_card_balance = this.gift_card_balance || options.gift_card_balance;

        }
        init_from_JSON(json) {
            super.init_from_JSON(...arguments);
            this.gift_card_code = json.gift_card_code;
            this.gift_card_balance = json.gift_card_balance;

        }
        export_as_JSON() {
            const json = super.export_as_JSON(...arguments);
            json.gift_card_code = this.gift_card_code;
            json.gift_card_balance = this.gift_card_balance;
            return json;
        }
        export_for_printing() {
            var json = super.export_for_printing(...arguments);
            // debugger
            json.gift_card_code =  this.gift_card_code;
            json.gift_card_balance = this.gift_card_balance;
            return json;
          }
    }

    Registries.Model.extend(Orderline, PosLoyaltyOrderline);

    return PosLoyaltyOrderline
})