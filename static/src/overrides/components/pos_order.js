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

const getRewardFallbackProduct = (pos, reward, configuredGiftCardRef) => {
    return (
        resolveProduct(pos, reward?.reward_product_id) ||
        resolveProduct(pos, reward?.reward_product_ids?.[0]) ||
        resolveProduct(pos, configuredGiftCardRef)
    );
};

patch(PosOrder.prototype, {
    _getRewardLineValuesDiscount(args) {
        // Adaptation of Odoo POS loyalty reward flow:
        // addons/pos_loyalty/static/src/overrides/models/pos_order.js
        const reward = args?.reward;
        const resolvedDiscountProduct = resolveProduct(this.pos, reward?.discount_line_product_id);

        if (!resolvedDiscountProduct) {
            const configuredGiftCardRef = this.pos?.config?.gift_card_product_id;
            const rewardFallbackProduct = getRewardFallbackProduct(this.pos, reward, configuredGiftCardRef);

            debugBarcode("Reward discount product missing, trying reward-linked fallback", {
                reward_id: reward?.id,
                reward_type: reward?.reward_type,
                program_type: reward?.program_type,
                raw_discount_line_product_id: reward?.discount_line_product_id || null,
                raw_reward_product_id: reward?.reward_product_id || null,
                raw_reward_product_ids: reward?.reward_product_ids || [],
                configured_gift_card_product_id: resolveId(configuredGiftCardRef),
                fallback_product_id: rewardFallbackProduct?.id || null,
            });

            if (rewardFallbackProduct) {
                const fallbackDiscountProductRef = getProductRef(rewardFallbackProduct);
                const patchedArgs = {
                    ...args,
                    reward: {
                        ...reward,
                        discount_line_product_id: fallbackDiscountProductRef,
                    },
                };

                debugBarcode("Using reward-linked discount fallback", {
                    reward_id: reward?.id,
                    reward_type: reward?.reward_type,
                    program_type: reward?.program_type,
                    fallback_product_id: rewardFallbackProduct.id,
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
