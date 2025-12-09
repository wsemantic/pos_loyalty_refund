# -*- coding: utf-8 -*-

from odoo import fields, models, api


class POSOrderLine(models.Model):
    _inherit = 'pos.order.line'

    gift_card_id = fields.Many2one('loyalty.card', string="Card")
    # gift_card_code = code = fields.Char(string="Code")
    # gift_card_balance = fields.Float(string="Points")

    def _export_for_ui(self, orderline):
        result = super()._export_for_ui(orderline)
        if orderline.gift_card_id.exists():
            result["gift_card_code"] = orderline.gift_card_id.code
            result["gift_card_balance"] = orderline.gift_card_id.points
        elif orderline.coupon_id.exists() and orderline.reward_id.program_type == 'gift_card':
            result["gift_card_code"] = orderline.coupon_id.code
            result["gift_card_balance"] = orderline.coupon_id.points
        else:
            result["gift_card_code"] = False
            result["gift_card_balance"] = False
            
        return result

    @api.model
    def _load_pos_data_fields(self, config_id):
        params = super()._load_pos_data_fields(config_id)
        params += ['gift_card_id']
        return params