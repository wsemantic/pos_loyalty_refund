# -*- coding: utf-8 -*-

{
    "name": "Custom POS Gift Card",
    "version": "15.0.1.0.1",
    "category": "Tools",
    "author": "Imanis",
    "website": "",
    "license": "AGPL-3",
    "summary": "Custom POS Gift Card",
    "depends": [
        'base','pos_gift_card'
    ],
    "data":{
        'data/gift_report.xml',
        'data/sequence.xml'
    },
    "assets":{
        'point_of_sale.assets': [
            'pos_loyalty_refund/static/src/js/models.js',
            'pos_loyalty_refund/static/src/js/giftcard_button.js',
            'pos_loyalty_refund/static/src/js/giftcardpopup.js',
            'pos_loyalty_refund/static/src/js/PaymentScreen.js',
            'pos_loyalty_refund/static/src/js/ReceiptScreen.js',
            'pos_loyalty_refund/static/src/js/OrderReceipt.js',
            
        ],
        'web.assets_qweb':[
            'pos_loyalty_refund/static/src/xml/ReceiptScreen.xml',
            'pos_loyalty_refund/static/src/xml/OrderReceipt.xml',
        ], 
    },
    
    "installable": True,
}
