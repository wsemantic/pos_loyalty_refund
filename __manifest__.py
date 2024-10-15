# -*- coding: utf-8 -*-

{
    "name": "WSEM Custom POS Gift Card",
    "version": "16.0.1.0.1",
    "category": "Tools",
    "license": "AGPL-3",
    "summary": "Custom POS Gift Card",
    "depends": [
        'point_of_sale','pos_loyalty','l10n_es_pos'
    ],
    "data":{
        'data/sequence.xml',
        'data/gift_report.xml',
        'views/res_config_settings_view.xml',
        'views/etiqueta_producto.xml',        
    },
     "assets":{
        'point_of_sale.assets': [
            'pos_loyalty_refund/static/src/js/GitftCardButton.js',
            'pos_loyalty_refund/static/src/js/Orderline.js',
            'pos_loyalty_refund/static/src/js/PaymentScreen.js',
            'pos_loyalty_refund/static/src/js/ReceiptScreen.js',
            'pos_loyalty_refund/static/src/js/ReprintGiftReceiptButton.js',
            'pos_loyalty_refund/static/src/js/ReprintGiftReceiptScreen.js',
            'pos_loyalty_refund/static/src/xml/GitftCardButton.xml',
            'pos_loyalty_refund/static/src/xml/OrderReceipt.xml',
            'pos_loyalty_refund/static/src/xml/ReceiptScreen.xml',
            'pos_loyalty_refund/static/src/xml/ReprintGiftReceiptButton.xml',
            'pos_loyalty_refund/static/src/xml/ReprintGiftReceiptScreen.xml',
            'pos_loyalty_refund/static/src/xml/TicketScreen.xml',
            'pos_loyalty_refund/static/src/xml/PaymentScreen.xml',
            'pos_loyalty_refund/static/src/scss/custom_receipt.scss',
        ]
     },
    "installable": True,
}
