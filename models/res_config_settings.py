# -*- coding: utf-8 -*-

from odoo import fields, models, api


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    gift_card_product_id = fields.Many2one('product.product', string='Gift Card Product', related='pos_config_id.gift_card_product_id', readonly=False)
    enable_second_print_with_price = fields.Boolean('Enable Second Print With Price', related='pos_config_id.enable_second_print_with_price', readonly=False)
