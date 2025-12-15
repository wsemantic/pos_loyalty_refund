# -*- coding: utf-8 -*-

from odoo import fields, models, api


class POSOrderLine(models.Model):
    _inherit = 'pos.order.line'

    gift_card_id = fields.Many2one('loyalty.card', string="Card")

    @api.model
    def _load_pos_data_fields(self, config_id):
        params = super()._load_pos_data_fields(config_id)
        params += ['gift_card_id']
        return params