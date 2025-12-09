odoo.define('pos_loyalty_refund.OrderReceipt', function (require) {
    'use strict';

    const Registries = require('point_of_sale.Registries');
    const OrderReceipt = require('point_of_sale.OrderReceipt');
    import { OrderReceipt } from "@point_of_sale/app/screens/receipt_screen/receipt/order_receipt";

    
    const GiftOrderReceipt = OrderReceipt => class extends OrderReceipt {

        get giftCard() {
            return this.receiptEnv.receipt.giftCard;
        }

    }
    // Definición para ajustar el ancho del recibo
    const OrderReceiptWidth = GiftOrderReceipt =>
        class extends GiftOrderReceipt {
            mounted() {
                super.mounted();
                this._applyReceiptWidth();
            }

            _applyReceiptWidth() {
                const receiptWidth = this.env.pos.config.receipt_width || 300; // Valor por defecto de 300 px
                
                // Aplicar el ancho a .pos y .pos-receipt-container
                const posContainer = this.el.closest('.pos');
                const receiptContainer = this.el.closest('.pos-receipt-container');

                if (posContainer) {
                    posContainer.style.width = `${receiptWidth}px`;
                }
                if (receiptContainer) {
                    receiptContainer.style.width = `${receiptWidth}px`;
                }
            }
        };


    // Registro de las extensiones en el POS en el orden adecuado
    Registries.Component.extend(OrderReceipt, GiftOrderReceipt); // Primero, aplicar GiftOrderReceipt
    Registries.Component.extend(GiftOrderReceipt, OrderReceiptWidth); // Luego, aplicar OrderReceiptWidth para el ancho

    return {
        GiftOrderReceipt,
        OrderReceiptWidth,
    };
});