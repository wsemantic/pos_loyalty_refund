odoo.define('pos_loyalty_refund.GitftCardButton', function(require) {
    'use strict';

    const PosComponent = require('point_of_sale.PosComponent');
    const ProductScreen = require('point_of_sale.ProductScreen')
    const { useListener } = require("@web/core/utils/hooks");
    const Registries = require('point_of_sale.Registries');
    const AbstractReceiptScreen = require('point_of_sale.AbstractReceiptScreen');


    class GitftCardButton extends PosComponent {
        setup() {
            super.setup();
            useListener('click', this.onClick);
        }
		async onClick() {
				const order = this.env.pos.get_order();
				// Obtener el ID y el producto de la tarjeta regalo
				var gift_card_product_id = this.env.pos.config.gift_card_product_id && this.env.pos.config.gift_card_product_id[0];
				var gift_card_product = this.env.pos.db.get_product_by_id(gift_card_product_id);
				var amount = Math.abs(order.get_total_with_tax());

				// Mostrar el popup para ingresar el monto
				let { confirmed, payload: amt } = await this.showPopup('TextInputPopup', {
					title: this.env._t('Enter Amount'),
					startingValue: amount,
					placeholder: this.env._t('Amount'),
				});

				if (confirmed && amt !== '') {
					// Convertir el monto ingresado a número y manejar posibles errores
					amt = parseFloat(amt);
					if (isNaN(amt)) {
						return this.showPopup('ErrorPopup', {
							title: this.env._t('Invalid Amount'),
							body: this.env._t('Please enter a valid number for the amount.'),
						});
					}

					console.log("Monto ingresado (con impuestos):", amt);

					// Obtener los impuestos aplicados al producto
					var taxes = gift_card_product.taxes_id.map(tax_id => this.env.pos.taxes_by_id[tax_id]);
					console.log("Impuestos aplicados al producto:", taxes);

					// Verificar si hay impuestos aplicados al producto
					if (taxes.length === 0) {
						console.log("El producto no tiene impuestos aplicados.");
						var amount_without_tax = amt;
					} else {
						// Calcular el factor de impuestos total para impuestos incluidos en el precio
						var tax_factor = 1;
						for (var i = 0; i < taxes.length; i++) {
							var tax = taxes[i];
							var tax_rate = tax.amount / 100;
							console.log(`Impuesto ${i + 1}:`, tax);
							console.log(`Tasa de impuesto ${i + 1}:`, tax_rate);

							// Solo considerar impuestos incluidos en el precio
							if (tax.price_include) {
								tax_factor += tax_rate;
								console.log(`Impuesto ${i + 1} incluido en el precio. Factor de impuestos actualizado:`, tax_factor);
							} else {
								console.log(`Impuesto ${i + 1} no incluido en el precio. No se ajusta el factor de impuestos.`);
							}
						}

						console.log("Factor de impuestos calculado:", tax_factor);

						// Calcular el monto sin impuestos
						var amount_without_tax = amt / tax_factor;
					}

					// Redondear el monto sin impuestos a dos decimales
					amount_without_tax = parseFloat(amount_without_tax.toFixed(2));
					console.log("Monto sin impuestos calculado:", amount_without_tax);

					// Añadir el producto al pedido con el monto sin impuestos
					order.add_product(gift_card_product, {
						quantity: 1,
						price: amount_without_tax,
						lst_price: amount_without_tax,
					});

					// Verificar el total del pedido después de añadir el producto
					console.log("Total del pedido con impuestos después de añadir el producto:", order.get_total_with_tax());
					console.log("Total del pedido sin impuestos después de añadir el producto:", order.get_total_without_tax());
					console.log("Líneas del pedido:", order.get_orderlines());
				}
		}

    }
    GitftCardButton.template = 'GitftCardButton';

    ProductScreen.addControlButton({
        component: GitftCardButton,
        condition: function() {
            return this.env.pos.config.gift_card_product_id && this.env.pos.config.gift_card_product_id[0] && this.env.pos.get_order().get_total_without_tax() < 0;
        },
    });

    Registries.Component.add(GitftCardButton);

    return GitftCardButton;

});
