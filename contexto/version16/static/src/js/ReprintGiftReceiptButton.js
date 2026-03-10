odoo.define('pos_loyalty_refund.ReprintGiftReceiptButton', function(require) {
    'use strict';


    const { useListener } = require("@web/core/utils/hooks");
    const PosComponent = require('point_of_sale.PosComponent');
    const Registries = require('point_of_sale.Registries');


    class ReprintGiftReceiptButton extends PosComponent {
        setup() {
            super.setup();
            useListener('click', this._onClick);
        }
        async _onClick() {
            if (!this.props.order) return;
            this.showScreen('ReprintGiftReceiptScreen', { order: this.props.order });
        }
    }
    ReprintGiftReceiptButton.template = 'ReprintGiftReceiptButton';
    Registries.Component.add(ReprintGiftReceiptButton);

    return ReprintGiftReceiptButton;

});
