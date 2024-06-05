# -*- coding: utf-8 -*-

{
    "name": "Custom POS Gift Card",
    "version": "16.0.1.0.1",
    "category": "Tools",
    "license": "AGPL-3",
    "summary": "Custom POS Gift Card",
    "depends": [
        'pos_loyalty'
    ],
    "data":{
        'data/sequence.xml',
        'data/gift_report.xml',
        'views/res_config_settings_view.xml'
    },
     "assets":{
        'point_of_sale.assets': [
            'pos_loyalty_refund/static/src/js/GitftCardButton.js',
            'pos_loyalty_refund/static/src/js/Orderline.js',
            'pos_loyalty_refund/static/src/js/PaymentScreen.js',
            'pos_loyalty_refund/static/src/js/ReceiptScreen.js',
            'pos_loyalty_refund/static/src/xml/GitftCardButton.xml',
            'pos_loyalty_refund/static/src/xml/OrderReceipt.xml',
            'pos_loyalty_refund/static/src/xml/ReceiptScreen.xml',
        ]
     },
    "installable": True,
}
