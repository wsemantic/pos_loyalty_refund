from odoo import api, fields, models


class GiftCard(models.Model):
    _inherit='gift.card'
    balance = fields.Monetary(compute="_compute_balance",store=True)
    code = fields.Char( required=True, readonly=True, copy=False)
    @api.model
    def create(self,vals):
        vals['code']=self.env['ir.sequence'].next_by_code('gift.card.code')
        return  super().create(vals)