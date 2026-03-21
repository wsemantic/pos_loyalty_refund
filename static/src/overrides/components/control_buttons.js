import { _t } from "@web/core/l10n/translation";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { SelectionPopup } from "@point_of_sale/app/utils/input_popups/selection_popup";
import { makeAwaitable } from "@point_of_sale/app/store/make_awaitable_dialog";
import { patch } from "@web/core/utils/patch";

patch(ControlButtons.prototype, {
    async onClickGiftCard() {
        const order = this.pos.get_order();
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
                const enteredAmount = parseAmount(num);
                var vals = {
                    product_id: giftCardProduct,
                    // The popup amount is meant to be the final amount to refund.
                    // Convert it to tax-excluded unit price only when taxes are excluded.
                    price_unit: computeTaxExcludedPrice(giftCardProduct, enteredAmount)
                };
                if (!Number.isFinite(vals.price_unit)) {
                    return;
                }
                var opt = {};
                const product = vals.product_id;
                const order = this.pos.get_order();
                const linkedPrograms = (
                    this.pos.models["loyalty.program"].getBy("trigger_product_ids", product.id) || []
                ).filter((p) => ["gift_card", "ewallet"].includes(p.program_type));
                let selectedProgram = null;
                if (linkedPrograms.length > 1) {
                    selectedProgram = await makeAwaitable(this.dialog, SelectionPopup, {
                        title: _t("Select program"),
                        list: linkedPrograms.map((program) => ({
                            id: program.id,
                            item: program,
                            label: program.name,
                        })),
                    });
                    if (!selectedProgram) {
                        return;
                    }
                } else if (linkedPrograms.length === 1) {
                    selectedProgram = linkedPrograms[0];
                }

                if (selectedProgram && selectedProgram.program_type == "gift_card") {
                    const shouldProceed = await this.pos._setupGiftCardOptions(selectedProgram, opt);
                    if (!shouldProceed) {
                        return;
                    }
                } else if (selectedProgram && selectedProgram.program_type == "ewallet") {
                    const shouldProceed = await this.pos.setupEWalletOptions(selectedProgram, opt);
                    if (!shouldProceed) {
                        return;
                    }
                }
                const potentialRewards = this.pos.getPotentialFreeProductRewards();
                const rewardsToApply = [];
                for (const reward of potentialRewards) {
                    for (const reward_product_id of reward.reward.reward_product_ids) {
                        if (reward_product_id.id == product.id) {
                            rewardsToApply.push(reward);
                        }
                    } else if (linkedPrograms.length === 1) {
                        selectedProgram = linkedPrograms[0];
                    }

                await this.pos.updatePrograms();
                if (rewardsToApply.length == 1) {
                    const reward = rewardsToApply[0];
                    order._applyReward(reward.reward, reward.coupon_id, {
                        product: result.product_id,
                    });
                }
            },
        });
    },
});
