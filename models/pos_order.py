# -*- coding: utf-8 -*-

from odoo import api, models
from collections import defaultdict


class PosOrder(models.Model):
    _inherit = 'pos.order'

    def confirm_coupon_programs(self, coupon_data):
        # Keys are stringified when using rpc
        coupon_data = {int(k): v for k, v in coupon_data.items()}

        self._check_existing_loyalty_cards(coupon_data)
        # Map negative id to newly created ids.
        coupon_new_id_map = {k: k for k in coupon_data.keys() if k > 0}

        # Create the coupons that were awarded by the order.
        coupons_to_create = {k: v for k, v in coupon_data.items() if k < 0 and not v.get('giftCardId')}
        coupon_create_vals = [{
            'program_id': p['program_id'],
            'partner_id': p.get('partner_id', False),
            'code': p.get('barcode') or self.env['loyalty.card']._generate_code(),
            'points': 0,
            'expiration_date': p.get('date_to'),
            'source_pos_order_id': self.id,
        } for p in coupons_to_create.values()]

        # Pos users don't have the create permission
        new_coupons = self.env['loyalty.card'].with_context(action_no_send_mail=True).sudo().create(coupon_create_vals)
        
        # We update the gift card that we sold when the gift_card_settings = 'scan_use'.
        gift_cards_to_update = [v for v in coupon_data.values() if v.get('giftCardId')]
        updated_gift_cards = self.env['loyalty.card']
        for coupon_vals in gift_cards_to_update:
            gift_card = self.env['loyalty.card'].browse(coupon_vals.get('giftCardId'))
            gift_card.write({
                'points': coupon_vals['points'],
                'source_pos_order_id': self.id,
                'partner_id': coupon_vals.get('partner_id', False),
            })
            updated_gift_cards |= gift_card

        # Map the newly created coupons
        for old_id, new_id in zip(coupons_to_create.keys(), new_coupons):
            coupon_new_id_map[new_id.id] = old_id

        all_coupons = self.env['loyalty.card'].browse(coupon_new_id_map.keys()).exists()
        lines_per_reward_code = defaultdict(lambda: self.env['pos.order.line'])
        for line in self.lines:
            if not line.reward_identifier_code:
                continue
            lines_per_reward_code[line.reward_identifier_code] |= line
        for coupon in all_coupons:
            if coupon.id in coupon_new_id_map:
                # Coupon existed previously, update amount of points.
                coupon.points += coupon_data[coupon_new_id_map[coupon.id]]['points']
            for reward_code in coupon_data[coupon_new_id_map[coupon.id]].get('line_codes', []):
                lines_per_reward_code[reward_code].coupon_id = coupon
        
        new_coupons_dict = {coupon.id: coupon.points for coupon in new_coupons}
        for line in self.lines:
            counpon_id = [counpon_id for counpon_id, points in new_coupons_dict.items() if points == line.price_unit]
            if not line.gift_card_id and counpon_id and self.config_id.gift_card_product_id and line.product_id.id == self.config_id.gift_card_product_id.id:
                # line.gift_card_id = counpon_id[0]
                line.sudo().write({
                    'gift_card_id': counpon_id[0]
                })
                del new_coupons_dict[counpon_id[0]]
        # Send creation email
        new_coupons.with_context(action_no_send_mail=False)._send_creation_communication()
        # Reports per program
        report_per_program = {}
        coupon_per_report = defaultdict(list)
        # Important to include the updated gift cards so that it can be printed. Check coupon_report.
        for coupon in new_coupons | updated_gift_cards:
            if coupon.program_id not in report_per_program:
                report_per_program[coupon.program_id] = coupon.program_id.communication_plan_ids.\
                    filtered(lambda c: c.trigger == 'create').pos_report_print_id
            for report in report_per_program[coupon.program_id]:
                coupon_per_report[report.id].append(coupon.id)
        return {
            'coupon_updates': [{
                'old_id': coupon_new_id_map[coupon.id],
                'id': coupon.id,
                'points': coupon.points,
                'code': coupon.code,
                'program_id': coupon.program_id.id,
                'partner_id': coupon.partner_id.id,
            } for coupon in all_coupons if coupon.program_id.is_nominative],
            'program_updates': [{
                'program_id': program.id,
                'usages': program.total_order_count,
            } for program in all_coupons.program_id],
            'new_coupon_info': [{
                'program_name': coupon.program_id.name,
                'expiration_date': coupon.expiration_date,
                'code': coupon.code,
            } for coupon in new_coupons if (
                coupon.program_id.applies_on == 'future'
                # Don't send the coupon code for the gift card and ewallet programs.
                # It should not be printed in the ticket.
                and coupon.program_id.program_type not in ['gift_card', 'ewallet']
            )],
            'coupon_report': coupon_per_report,    
        }

   
    def get_giftcard_lines(self):
        return {
            'updated_lines': { line.id: {
                'price': line.price_unit,
                'gift_card_id': line.gift_card_id.id,
                'gift_card_code': line.gift_card_id.code,
                'gift_card_balance': line.gift_card_id.points,
             } for line in self.lines if line.gift_card_id.exists()},
             'gc_reward_line': { line.id: {
                'price': line.price_unit,
                'gift_card_code': line.coupon_id.code,
                'gift_card_balance': line.coupon_id.points,
             } for line in self.lines if line.coupon_id.exists() and line.reward_id.program_type == 'gift_card'}
        }


class LoyaltyCard(models.Model):
    _inherit = 'loyalty.card'

    @api.model
    def _generate_code(self):
        """
        Barcode identifiable codes.
        """
        return self.env['ir.sequence'].next_by_code('gift.card.sequence')