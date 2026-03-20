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

const normalizeProductRef = (value, fallbackProduct = null) => {
    if (!value && !fallbackProduct) {
        return null;
    }
    if (Array.isArray(value)) {
        return value;
    }
    if (typeof value === "number") {
        return value;
    }
    if (value && typeof value === "object" && !value.taxes_id) {
        if (value.id != null && value.display_name) {
            return [value.id, value.display_name];
        }
        if (value.id != null && value.name) {
            return [value.id, value.name];
        }
        if (value.id != null) {
            return value.id;
        }
    }
    if (fallbackProduct?.id != null) {
        return [fallbackProduct.id, fallbackProduct.display_name || fallbackProduct.name || ""];
    }
    return null;
};

const summarizeProductValue = (value) => {
    if (!value) {
        return value;
    }
    if (Array.isArray(value)) {
        return value;
    }
    if (value.taxes_id) {
        return {
            id: value.id,
            name: value.display_name || value.name,
            taxes_id: value.taxes_id,
        };
    }
    if (typeof value === "object") {
        return {
            id: value.id ?? value[0] ?? null,
            name: value.display_name || value.name || value[1] || null,
        };
    }
    return value;
};

patch(PosOrder.prototype, {
    _getRewardLineValuesDiscount(args) {
        // Adaptation of Odoo POS loyalty reward flow:
        // addons/pos_loyalty/static/src/overrides/models/pos_order.js
        const reward = args?.reward;
        const candidateSources = [
            ["reward.discount_line_product_id", reward?.discount_line_product_id],
            ["args.product", args?.product],
            ["reward.reward_product_id", reward?.reward_product_id],
            ["reward.reward_product_ids[0]", reward?.reward_product_ids?.[0]],
            ["pos.config.gift_card_product_id", this.pos?.config?.gift_card_product_id],
        ];
        const resolvedDiscountProduct = resolveProduct(this.pos, reward?.discount_line_product_id);
        const fallbackCandidate = candidateSources
            .map(([source, value]) => ({
                source,
                value,
                resolvedProduct: resolveProduct(this.pos, value),
            }))
            .find((candidate) => candidate.resolvedProduct);
        const fallbackDiscountProduct = fallbackCandidate?.resolvedProduct || null;
        const fallbackDiscountProductRef = fallbackCandidate
            ? normalizeProductRef(fallbackCandidate.value, fallbackDiscountProduct)
            : null;

        if (!resolvedDiscountProduct) {
            debugBarcode("Discount product candidates", {
                reward_id: reward?.id,
                reward_type: reward?.reward_type,
                program_type: reward?.program_type,
                candidates: candidateSources.map(([source, value]) => ({
                    source,
                    raw: summarizeProductValue(value),
                    normalized_ref: normalizeProductRef(value),
                    resolved_product_id: resolveId(resolveProduct(this.pos, value)),
                })),
                selected_source: fallbackCandidate?.source || null,
            });
        }

        let patchedArgs = args;
        if (!resolvedDiscountProduct && fallbackDiscountProductRef) {
            patchedArgs = {
                ...args,
                reward: {
                    ...reward,
                    discount_line_product_id: fallbackDiscountProductRef,
                },
            };
            debugBarcode("Fallback discount line product applied", {
                reward_id: reward?.id,
                selected_source: fallbackCandidate?.source || null,
                fallback_product_id: fallbackDiscountProduct?.id || resolveId(fallbackDiscountProductRef),
                fallback_product_ref: fallbackDiscountProductRef,
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
