odoo.define('pos_loyalty_refund.ReprintGiftReceiptScreen', function(require) {
    'use strict';


    const AbstractReceiptScreen = require('point_of_sale.AbstractReceiptScreen');
    const Registries = require('point_of_sale.Registries');

    const ReprintGiftReceiptScreen = (AbstractReceiptScreen) => {
        class ReprintGiftReceiptScreen extends AbstractReceiptScreen {
            setup() {
                super.setup();
                owl.onMounted(this.onMounted);
            }
            onMounted() {
                setTimeout(() => {
                    this.printReceipt();
                }, 50);
            }
            confirm() {
                this.showScreen('TicketScreen', { reuseSavedUIState: true });
            }
            async printReceipt() {
                if(this.env.proxy.printer && this.env.pos.config.iface_print_skip_screen) {
                    let result = await this._printReceipt();
                    if(result)
                        this.showScreen('TicketScreen', { reuseSavedUIState: true });
                }
            }
            async tryReprint() {
                await this._printReceipt();
            }
        }
        ReprintGiftReceiptScreen.template = 'ReprintGiftReceiptScreen';
        return ReprintGiftReceiptScreen;
    };
    
    Registries.Component.addByExtending(ReprintGiftReceiptScreen, AbstractReceiptScreen);
    return ReprintGiftReceiptScreen;
});
