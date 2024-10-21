odoo.define('pos_loyalty_refund.ReceiptScreen', function (require) {
    'use strict';


    const ReceiptScreen = require('point_of_sale.ReceiptScreen');
    const Registries = require('point_of_sale.Registries');

    const GiftReceiptScreen = ReceiptScreen => class extends ReceiptScreen {
        setup() {
            super.setup();
            this.orderUiState.printGift = false;
            this.orderUiState.printMessage = "Print Gift Receipt";
            this.orderUiState.printClass = "fa fa-gift";

        }
        changePrintGift(ev) {
            this.orderUiState.printGift = !this.orderUiState.printGift;
            this.orderUiState.printMessage = this.orderUiState.printGift ? "Print Normal Receipt": "Print Gift Receipt";
            this.orderUiState.printClass = this.orderUiState.printGift ? "fa fa-print": "fa fa-gift";
            setTimeout(() => {
                this.printReceipt();
            }, 50);
        }
        async printReceipt() {
            const currentOrder = this.currentOrder;
            const isPrinted = await this._printReceipt();
            if((this.props.receiptWithoutPrice || this.orderUiState.printGift) && this.env.pos.config.enable_second_print_with_price){
                $('.current-order-gift-receipt').html($('.pos-receipt-container').html());
                $('.pos-receipt-container').html($('.current-order-receipt').html());
                await this._printReceipt();
                $('.pos-receipt-container').html($('.current-order-gift-receipt').html());
            }
            if (isPrinted) {
                currentOrder._printed = true;
            }
        }
    }

    Registries.Component.extend(ReceiptScreen, GiftReceiptScreen);

    return GiftReceiptScreen;
});