# -*- coding: utf-8 -*-

from odoo import fields, models


class PosConfig(models.Model):
    _inherit = 'pos.config'

    gift_card_product_id = fields.Many2one('product.product', 'Producto Tarj Regalo')
    enable_second_print_with_price = fields.Boolean('Doble impresión con precio en regalos')
    receipt_width = fields.Integer(string="Receipt Width (px)", default=220, help="Ancho recibo 58mm o 80mm")
