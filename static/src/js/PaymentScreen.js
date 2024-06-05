odoo.define('pos_loyalty_refund.PaymentScreen', function (require) {
    "use strict";

    const PaymentScreen = require('point_of_sale.PaymentScreen');
    const Registries = require('point_of_sale.Registries');

    const session = require('web.session');
    
    const PosGCPaymentScreen = PaymentScreen => class extends PaymentScreen {
        async _postPushOrderResolve(order, order_server_ids) {
            const res = await super._postPushOrderResolve(...arguments);
            let result = await this.rpc({
                model: 'pos.order',
                method: 'get_giftcard_lines',
                args: [order_server_ids],
                kwargs: { context: session.user_context },
            });
            if (Object.keys(result.updated_lines).length){
                for (const line of order.get_orderlines()) {
                    if(this.env.pos.config.gift_card_product_id[0] == line.product.id) {
                        const gclines = Object.values(result.updated_lines).filter((value) => value.price === line.price);
                        line.gift_card_code = gclines[0].gift_card_code
                        line.gift_card_balance = gclines[0].gift_card_balance
                    }
                }
            }
            return res;
        }
    };

    Registries.Component.extend(PaymentScreen, PosGCPaymentScreen);

    return PosGCPaymentScreen;
});