# -*- coding: utf-8 -*-

from odoo import fields, models


class PosConfig(models.Model):
    _inherit = 'pos.config'

    gift_card_product_id = fields.Many2one('product.product', 'Producto Tarj Regalo')
    enable_second_print_with_price = fields.Boolean('Doble impresión con precio en regalos')
    receipt_width = fields.Integer(
        string="Ancho del Recibo (px)",
        config_parameter='point_of_sale.receipt_width',
        default=300,  # Valor aproximado para impresoras de 80 mm
        help="300 es para impresoras de 80 mm. Modificar a 220 para impresoras de 58mm"
    )
