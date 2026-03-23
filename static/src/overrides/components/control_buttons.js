import { _t } from "@web/core/l10n/translation";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { patch } from "@web/core/utils/patch";

patch(ControlButtons.prototype, {
    async onClickGiftCard() {
        // Adaptation of Odoo ProductScreen control buttons flow:
        // addons/point_of_sale/static/src/app/screens/product_screen/control_buttons/control_buttons.js
        var amount = Math.abs(this.pos.get_order().get_total_with_tax());
        const parseAmount = (value) => {
            if (typeof value === "number") {
                return value;
            }
            const normalizedValue = String(value ?? "")
                .replace(/\s/g, "")
                .replace(/[^\d,.-]/g, "")
                .replace(/,(?=\d{1,2}$)/, ".")
                .replace(/,/g, "");
            return Number.parseFloat(normalizedValue);
        };
        const getProductTaxes = (product) => {
            const taxes = product?.taxes_id || [];
            const taxModel = this.pos.models["account.tax"];
            return taxes
                .map((tax) => (typeof tax === "number" ? taxModel?.get(tax) : tax))
                .filter(Boolean);
        };
        const computeTaxExcludedPrice = (product, priceWithTax) => {
            const taxes = getProductTaxes(product);
            let priceWithoutTax = priceWithTax;
            const excludedPercentTaxes = taxes.filter(
                (tax) => tax.amount_type === "percent" && !tax.price_include
            );
            if (excludedPercentTaxes.length) {
                const totalPercent = excludedPercentTaxes.reduce((sum, tax) => sum + tax.amount, 0);
                priceWithoutTax = priceWithTax / (1 + totalPercent / 100);
            }
            return Number.parseFloat(priceWithoutTax.toFixed(2));
        };
        const configuredGiftCardProduct = this.pos.config.gift_card_product_id;
        const giftCardProductId = Array.isArray(configuredGiftCardProduct)
            ? configuredGiftCardProduct[0]
            : configuredGiftCardProduct?.id || configuredGiftCardProduct;
        const giftCardProduct =
            (configuredGiftCardProduct && configuredGiftCardProduct.id && configuredGiftCardProduct) ||
            this.pos.models["product.product"].get(giftCardProductId);
        if (!giftCardProduct) {
            this.dialog.add(AlertDialog, {
                title: _t("Gift card product not found"),
                body: _t("Check the POS configuration and reload the session."),
            });
            return;
        }
        this.dialog.add(NumberPopup, {
            title: _t("Enter Amount"),
            startingValue: this.env.utils.formatCurrency(amount, false),
            formatDisplayedValue: (x) => `${this.pos.currency.symbol} ${x}`,
            placeholder: _t("Amount"),
            getPayload: async (num) => {
                try {
                    const enteredAmount = parseAmount(num);
                    const priceUnit = computeTaxExcludedPrice(giftCardProduct, enteredAmount);
                    if (!Number.isFinite(priceUnit)) {
                        return;
                    }
                    await this.pos.addLineToCurrentOrder(
                        {
                            product_id: giftCardProduct,
                        },
                        {
                            price_unit: priceUnit,
                        }
                    );
                } catch (error) {
                    console.error("[pos_loyalty_refund] Error while confirming gift card amount", error);
                    this.dialog.add(AlertDialog, {
                        title: _t("Gift card error"),
                        body: error?.message || _t("An unexpected error occurred while applying the gift card."),
                    });
                }
            },
        });
    },
});
