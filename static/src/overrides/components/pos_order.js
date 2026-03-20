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

const getProductRef = (product) => {
    if (!product?.id) {
        return null;
    }
    return [product.id, product.display_name || product.name || ""];
};

patch(PosOrder.prototype, {
    _getRewardLineValuesDiscount(args) {
        // Adaptation of Odoo POS loyalty reward flow:
        // addons/pos_loyalty/static/src/overrides/models/pos_order.js
        const reward = args?.reward;
        const resolvedDiscountProduct = resolveProduct(this.pos, reward?.discount_line_product_id);

        if (!resolvedDiscountProduct) {
            const configuredGiftCardRef = this.pos?.config?.gift_card_product_id;
            const configuredGiftCardProduct = resolveProduct(this.pos, configuredGiftCardRef);

            debugBarcode("Reward discount product missing, trying configured gift card product", {
                reward_id: reward?.id,
                reward_type: reward?.reward_type,
                raw_discount_line_product_id: reward?.discount_line_product_id || null,
                configured_gift_card_product_id: resolveId(configuredGiftCardRef),
                configured_gift_card_product_loaded: !!configuredGiftCardProduct,
            });

            if (configuredGiftCardProduct) {
                const fallbackDiscountProductRef = getProductRef(configuredGiftCardProduct);
                const patchedArgs = {
                    ...args,
                    reward: {
                        ...reward,
                        discount_line_product_id: fallbackDiscountProductRef,
                    },
                };

                debugBarcode("Using configured gift card product as reward discount fallback", {
                    reward_id: reward?.id,
                    fallback_product_id: configuredGiftCardProduct.id,
                    fallback_product_ref: fallbackDiscountProductRef,
                });

                return super._getRewardLineValuesDiscount(patchedArgs);
            }
        }

        return super._getRewardLineValuesDiscount(args);
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
