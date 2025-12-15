import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { Orderline } from "@point_of_sale/app/generic_components/orderline/orderline";
import { patch } from "@web/core/utils/patch";

patch(PosOrderline.prototype, {
    // setup(vals) {
    //     this.gift_card_code = this.gift_card_id ? this.gift_card_id.code : false;
    //     this.gift_card_balance = this.gift_card_id ? this.gift_card_id.points : 0;
    //     return super.setup(...arguments);
    // },
    getDisplayData() {
        return {
            ...super.getDisplayData(),
            gift_card_code: this.gift_card_id ? this.gift_card_id.code : undefined,
            gift_card_balance: this.gift_card_id ? this.gift_card_id.points : 0,
        };
    },
    export_for_printing() {
        const result = super.export_for_printing(...arguments);
        result.gift_card_code = this.gift_card_id ? this.gift_card_id.code : false;
        result.gift_card_balance = this.gift_card_id ? this.gift_card_id.points : 0;
        return result;
    },
});

patch(Orderline, {
    props: {
        ...Orderline.props,
        line: {
            ...Orderline.props.line,
            shape: {
                ...Orderline.props.line.shape,
                gift_card_code: { type: String, optional: true },
                gift_card_balance: { type: Number, optional: true },
            },
        },
    },
});
