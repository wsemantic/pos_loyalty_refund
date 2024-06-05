# -*- coding: utf-8 -*-

from odoo import fields, models


class PosConfig(models.Model):
    _inherit = 'pos.config'

    gift_card_product_id = fields.Many2one('product.product', 'Gift Card Product')
