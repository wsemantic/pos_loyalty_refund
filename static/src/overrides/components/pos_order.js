import { PosOrder } from "@point_of_sale/app/models/pos_order";
import { patch } from "@web/core/utils/patch";

const POS_BARCODE_DEBUG = true;

const debugBarcode = (...args) => {
    if (POS_BARCODE_DEBUG) {
        console.log("[pos_loyalty_refund][barcode]", ...args);
    }
};

const resolveId = (value) => {
    if (Array.isArray(value)) {
        return value[0];
    }
    if (value && typeof value === "object") {
        return value.id ?? value[0] ?? null;
    }
    return value ?? null;
};

const resolveProduct = (pos, value) => {
    if (!value) {
        return null;
    }
    if (value.taxes_id) {
        return value;
    }
    const productId = resolveId(value);
    return productId ? pos?.models["product.product"]?.get(productId) || null : null;
};

patch(PosOrder.prototype, {
    _getRewardLineValuesDiscount(args) {
        // Adaptation of Odoo POS loyalty reward flow:
        // addons/pos_loyalty/static/src/overrides/models/pos_order.js
        const reward = args?.reward;
        const fallbackDiscountProduct =
            resolveProduct(this.pos, reward?.discount_line_product_id) ||
            resolveProduct(this.pos, args?.product) ||
            resolveProduct(this.pos, reward?.reward_product_id) ||
            resolveProduct(this.pos, reward?.reward_product_ids?.[0]) ||
            resolveProduct(this.pos, this.pos?.config?.gift_card_product_id);

        let patchedArgs = args;
        if (!resolveProduct(this.pos, reward?.discount_line_product_id) && fallbackDiscountProduct) {
            patchedArgs = {
                ...args,
                reward: {
                    ...reward,
                    discount_line_product_id: fallbackDiscountProduct,
                },
            };
            debugBarcode("Fallback discount line product applied", {
                reward_id: reward?.id,
                fallback_product_id: fallbackDiscountProduct.id,
            });
        }

        return super._getRewardLineValuesDiscount(patchedArgs);
    },

    export_for_printing(baseUrl, headerData) {
        const json = super.export_for_printing(...arguments);
        const uniqueId =
            this.l10n_es_unique_id ||
            json.l10n_es_unique_id;

        json.gift_card_code = this.gift_card_code;
        json.gift_card_balance = this.gift_card_balance;
        json.l10n_es_unique_id = uniqueId;

        json.headerData = json.headerData || {};
        json.headerData.l10n_es_unique_id = uniqueId;
        json.headerData.date = json.date;

        const partnerId =
            resolveId(json.partner_id) ??
            resolveId(json.partner?.id) ??
            resolveId(json.headerData.partner?.id);
        const simplifiedPartnerId =
            resolveId(json.simplified_partner_id) ??
            resolveId(json.headerData.simplified_partner_id) ??
            resolveId(this.pos?.config?.simplified_partner_id);

        if (partnerId != null && simplifiedPartnerId != null && `${partnerId}` === `${simplifiedPartnerId}`) {
            json.partner = null;
            if (json.headerData.partner) {
                json.headerData.partner = null;
            }
        }

        debugBarcode("export_for_printing payload", {
            order_uid: this.uid,
            order_server_id: this.server_id,
            uniqueId,
            headerData: json.headerData,
        });

        return json;
    },
});
