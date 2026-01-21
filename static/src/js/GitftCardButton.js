odoo.define('pos_loyalty_refund.GitftCardButton', function (require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen')
    const { useListener } = require("@web/core/utils/hooks");
    const Registries = require('point_of_sale.Registries');
    const AbstractReceiptScreen = require('point_of_sale.AbstractReceiptScreen');


    class GitftCardButton extends PosComponent {
        setup() {
            super.setup();
            useListener('click', this.onClick);
        }
        async onClick() {
            const order = this.env.pos.get_order();
            var gift_card_product_id = this.env.pos.config.gift_card_product_id && this.env.pos.config.gift_card_product_id[0];
            var gift_card_product = this.env.pos.db.get_product_by_id(gift_card_product_id);
            var amount = Math.abs(this.env.pos.get_order().get_total_with_tax());
            let { confirmed, payload: amt } = await this.showPopup('TextInputPopup', {
                title: this.env._t('Enter Amount'),
                startingValue: this.env.pos.format_currency_no_symbol(amount),
                placeholder: this.env._t('Amount'),
            });
            if (confirmed) {
                if (amt !== '') {
                    const linkedProgramIds = this.env.pos.productId2ProgramIds[gift_card_product.id] || [];
                    const linkedPrograms = linkedProgramIds.map(id => this.env.pos.program_by_id[id]);
                    let selectedProgram = null;
                    if (linkedPrograms.length > 1) {
                        const { confirmed, payload: program } = await this.showPopup('SelectionPopup', {
                            title: this.env._t('Select program'),
                            list: linkedPrograms.map((program) => ({
                                id: program.id,
                                item: program,
                                label: program.name,
                            })),
                        });
                        if (confirmed) {
                            selectedProgram = program;
                        } else {
                            return;
                        }
                    } else if (linkedPrograms.length === 1) {
                        selectedProgram = linkedPrograms[0];
                    }

                    if (!selectedProgram) {
                        this.showPopup('ErrorPopup', {
                            title: this.env._t('Error'),
                            body: this.env._t('No loyalty program found for this gift card product.'),
                        });
                        return;
                    }

                    return order.add_product(gift_card_product, {
                        quantity: 1,
                        price: amt,
                        lst_price: amt,
                        eWalletGiftCardProgram: selectedProgram,
                    });
                }
            }
        }
    }
    GitftCardButton.template = 'GitftCardButton';

    ProductScreen.addControlButton({
        component: GitftCardButton,
        condition: function() {
            return this.env.pos.config.gift_card_product_id && this.env.pos.config.gift_card_product_id[0] && this.env.pos.get_order().get_total_without_tax() < 0;
        },
    });

    Registries.Component.add(GitftCardButton);

    return GitftCardButton;

});
