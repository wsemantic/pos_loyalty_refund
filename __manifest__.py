# -*- coding: utf-8 -*-

{
    "name": "WSEM Custom POS Gift Card",
    "version": "18.0.1.0.1",
    "category": "Tools",
    "license": "AGPL-3",
    "summary": "Custom POS Gift Card",
    "depends": [
        'point_of_sale',
        'pos_loyalty',
        'product',
        'l10n_es_pos_oca',
    ],
    "data": [
        'data/sequence.xml',
        'data/gift_report.xml',
        'views/res_config_settings_view.xml',
        'views/etiqueta_producto.xml',
    ],
    'assets': {
        'point_of_sale._assets_pos': [
            'pos_loyalty_refund/static/src/overrides/**/*',
            'pos_loyalty_refund/static/src/scss/custom_receipt.scss',
        ],
    },
    "installable": True,
}
