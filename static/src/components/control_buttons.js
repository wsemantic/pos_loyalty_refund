import { _t } from "@web/core/l10n/translation";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { ask, makeAwaitable } from "@point_of_sale/app/store/make_awaitable_dialog";
import { formatCurrency } from "@point_of_sale/app/models/utils/currency";
import { TextInputPopup } from "@point_of_sale/app/utils/input_popups/text_input_popup";
import { patch } from "@web/core/utils/patch";

patch(ControlButtons.prototype, {
    async onClickGiftCard() {
        const order = this.pos.get_order();
        // var gift_card_product_id = this.pos.config.gift_card_product_id && this.pos.config.gift_card_product_id[0];
        // var gift_card_product = this.pos.db.get_product_by_id(gift_card_product_id);
        var amount = Math.abs(this.pos.get_order().get_total_with_tax());
        console.log(this.pos.config.gift_card_product_id)
        this.dialog.add(NumberPopup, {
            title: _t("Enter Amount"),
            startingValue: this.env.utils.formatCurrency(amount, false),
            formatDisplayedValue: (x) => `${this.pos.currency.symbol} ${x}`,
            placeholder: _t("Amount"),
            getPayload: async (num) => {
                // await this.pos.addLineToCurrentOrder({ product_id: this.pos.config.gift_card_product_id }, { price_unit: parseFloat(num ?? "") });
                var vals = {
                    product_id: this.pos.config.gift_card_product_id,
                    price_unit: parseFloat(num ?? "")
                };
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

                // const orderTotal = this.pos.get_order().get_total_with_tax();
                // if (
                //     selectedProgram &&
                //     ["gift_card", "ewallet"].includes(selectedProgram.program_type) &&
                //     orderTotal < 0
                // ) {
                //     opt.price_unit = -orderTotal;
                // }
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
                    }
                }

                // // move price_unit from opt to vals
                // if (opt.price_unit !== undefined) {
                //     vals.price_unit = opt.price_unit;
                //     delete opt.price_unit;
                // }

                const result = await this.pos.addLineToOrder(vals, order, opt);

                await this.pos.updatePrograms();
                if (rewardsToApply.length == 1) {
                    const reward = rewardsToApply[0];
                    order._applyReward(reward.reward, reward.coupon_id, {
                        product: result.product_id,
                    });
                }
                this.pos.updateRewards();
            },
        });
        // let { confirmed, payload: amt } = await this.showPopup('TextInputPopup', {
        //     title: this.env._t('Enter Amount'),
        //     startingValue: this.pos.format_currency_no_symbol(amount),
        //     placeholder: this.env._t('Amount'),
        // });
        // if (confirmed) {
        //     if (amt !== '') {
        //         const linkedProgramIds = this.env.pos.productId2ProgramIds[gift_card_product.id] || [];
        //         const linkedPrograms = linkedProgramIds.map(id => this.env.pos.program_by_id[id]);
        //         if (linkedPrograms.length > 1) {
        //             let selectedProgram = null;
        //             const { confirmed, payload: program } = await this.showPopup('SelectionPopup', {
        //                 title: this.env._t('Select program'),
        //                 list: linkedPrograms.map((program) => ({
        //                     id: program.id,
        //                     item: program,
        //                     label: program.name,
        //                 })),
        //             });
        //             if (confirmed) {
        //                 selectedProgram = program;
        //             }
        //             return order.add_product(gift_card_product, {
        //                 quantity: 1,
        //                 price: amt,
        //                 lst_price: amt,
        //                 eWalletGiftCardProgram: selectedProgram,
        //                 // is_reward_line: true,
        //             });
        //         } 
        //         return order.add_product(gift_card_product, {
        //             quantity: 1,
        //             price: amt,
        //             lst_price: amt,
        //             // eWalletGiftCardProgram: selectedProgram,
        //             // is_reward_line: true,
        //         });
        //     }
        // }
    },
});
