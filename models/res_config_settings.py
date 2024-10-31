# -*- coding: utf-8 -*-

from odoo import fields, models, api


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    gift_card_product_id = fields.Many2one('product.product', string='Gift Card Product', related='pos_config_id.gift_card_product_id', readonly=False)
    enable_second_print_with_price = fields.Boolean('Enable Second Print With Price', related='pos_config_id.enable_second_print_with_price', readonly=False)
    receipt_width = fields.Integer(
        string="Ancho del Recibo (px)",
        default=300,
        related="pos_config_id.receipt_width",
        readonly=False,  # Permite editar el campo desde `res.config.settings`
        help="300 para impresoras de 80 mm. Modificalo a 220 para impresora de 58mm"
    )