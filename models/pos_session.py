# -*- coding: utf-8 -*-

from odoo import models


class PosSession(models.Model):
    _inherit = "pos.session"

    def _loader_params_pos_config(self):
        params = super()._loader_params_pos_config()
        fields = params.setdefault("search_params", {}).setdefault("fields", [])
        if "receipt_width" not in fields:
            fields.append("receipt_width")
        if "simplified_partner_id" not in fields:
            fields.append("simplified_partner_id")
        return params
