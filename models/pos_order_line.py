# -*- coding: utf-8 -*-

from odoo import fields, models


class POSOrderLine(models.Model):
    _inherit = 'pos.order.line'

    gift_card_id = fields.Many2one('loyalty.card', string="Card")

    def _export_for_ui(self, orderline):
        result = super()._export_for_ui(orderline)
        result["gift_card_code"] = orderline.gift_card_id.code
        result["gift_card_balance"] = orderline.gift_card_id.points

        return result