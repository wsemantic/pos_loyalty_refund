import { _t } from "@web/core/l10n/translation";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { ControlButtons } from "@point_of_sale/app/screens/product_screen/control_buttons/control_buttons";
import { formatCurrency } from "@point_of_sale/app/models/utils/currency";
import { TextInputPopup } from "@point_of_sale/app/utils/input_popups/text_input_popup";
import { patch } from "@web/core/utils/patch";

patch(ControlButtons.prototype, {
    async onClickGiftCard() {
        const order = this.pos.get_order();
        // var gift_card_product_id = this.pos.config.gift_card_product_id && this.pos.config.gift_card_product_id[0];
        // var gift_card_product = this.pos.db.get_product_by_id(gift_card_product_id);
        var amount = Math.abs(this.pos.get_order().get_total_with_tax());
        this.dialog.add(TextInputPopup, {
            title: _t("Enter Amount"),
            startingValue: this.env.utils.formatCurrency(amount),
            placeholder: _t("Amount"),
            getPayload: async (code) => {
                code = code.trim();
                if (code !== "") {
                    const res = await this.pos.activateCode(code);
                    if (res !== true) {
                        this.notification.add(res, { type: "danger" });
                    }
                }
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
    // FIXME business method in a compoenent, maybe to move in pos_store
    // async apply_discount(pc) {
    //     const order = this.pos.get_order();
    //     const lines = order.get_orderlines();
    //     const product = this.pos.config.discount_product_id;

    //     if (product === undefined) {
    //         this.dialog.add(AlertDialog, {
    //             title: _t("No discount product found"),
    //             body: _t(
    //                 "The discount product seems misconfigured. Make sure it is flagged as 'Can be Sold' and 'Available in Point of Sale'."
    //             ),
    //         });
    //         return;
    //     }
    //     // Remove existing discounts
    //     lines.filter((line) => line.get_product() === product).forEach((line) => line.delete());

    //     // Add one discount line per tax group
    //     const linesByTax = order.get_orderlines_grouped_by_tax_ids();
    //     for (const [tax_ids, lines] of Object.entries(linesByTax)) {
    //         // Note that tax_ids_array is an Array of tax_ids that apply to these lines
    //         // That is, the use case of products with more than one tax is supported.
    //         const tax_ids_array = tax_ids
    //             .split(",")
    //             .filter((id) => id !== "")
    //             .map((id) => Number(id));

    //         const baseToDiscount = order.calculate_base_amount(
    //             lines.filter((ll) => ll.isGlobalDiscountApplicable())
    //         );

    //         const taxes = tax_ids_array
    //             .map((taxId) => this.pos.models["account.tax"].get(taxId))
    //             .filter(Boolean);

    //         // We add the price as manually set to avoid recomputation when changing customer.
    //         const discount = (-pc / 100.0) * baseToDiscount;
    //         if (discount < 0) {
    //             await this.pos.addLineToCurrentOrder(
    //                 { product_id: product, price_unit: discount, tax_ids: [["link", ...taxes]] },
    //                 { merge: false }
    //             );
    //         }
    //     }
    // },
});
