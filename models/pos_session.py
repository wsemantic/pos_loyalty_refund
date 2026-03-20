# -*- coding: utf-8 -*-

from odoo import models
from odoo.osv import expression


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

    def _loader_params_loyalty_reward(self):
        # Adaptation of Odoo POS loyalty loader:
        # addons/pos_loyalty/models/pos_session.py
        params = super()._loader_params_loyalty_reward()
        fields = params.setdefault("search_params", {}).setdefault("fields", [])
        for field_name in ["discount_line_product_id", "reward_product_id", "reward_product_ids", "tax_ids"]:
            if field_name not in fields:
                fields.append(field_name)
        return params

    def _loader_params_product_product(self):
        # Ensure POS also loads loyalty discount helper products used by gift card / eWallet rewards.
        params = super()._loader_params_product_product()
        search_params = params.setdefault("search_params", {})
        domain = search_params.get("domain", [])

        reward_domain = [("discount_line_product_id", "!=", False)]
        if self.config_id.company_id:
            reward_domain.append(("company_id", "in", [False, self.config_id.company_id.id]))
        discount_product_ids = self.env["loyalty.reward"].sudo().search(reward_domain).mapped("discount_line_product_id").ids

        forced_product_ids = set(discount_product_ids)
        if self.config_id.gift_card_product_id:
            forced_product_ids.add(self.config_id.gift_card_product_id.id)

        if forced_product_ids:
            search_params["domain"] = expression.OR([domain, [("id", "in", list(forced_product_ids))]])

        return params
