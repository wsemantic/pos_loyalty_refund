odoo.define('pos_loyalty_refund.OrderReceipt', function (require) {
    'use strict';

    const Registries = require('point_of_sale.Registries');
    const OrderReceipt = require('point_of_sale.OrderReceipt');
    
    const GiftOrderReceipt = OrderReceipt => class extends OrderReceipt {

        get giftCard() {
            return this.receiptEnv.receipt.giftCard;
        }

    }
    // Definición para ajustar el ancho del recibo
    const OrderReceiptWidth = GiftOrderReceipt =>
        class extends GiftOrderReceipt {
            // Método que aplica el ancho configurable en el recibo
            mounted() {
                super.mounted();
                this._applyReceiptWidth();
            }

            _applyReceiptWidth() {
                const receiptWidth = this.env.pos.config.receipt_width || 220; // Valor por defecto
                const receiptContainer = this.el.querySelector('.pos-receipt');
                
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