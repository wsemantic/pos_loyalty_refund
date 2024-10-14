odoo.define('pos_loyalty_refund.PaymentScreen', function (require) {
    "use strict";

    const PaymentScreen = require('point_of_sale.PaymentScreen');
    const Registries = require('point_of_sale.Registries');
    const { useListener } = require("@web/core/utils/hooks");
    const { useErrorHandlers, useAsyncLockedMethod } = require('point_of_sale.custom_hooks');

    const session = require('web.session');

    const PosGCPaymentScreen = PaymentScreen => class extends PaymentScreen {
        setup() {
            super.setup();
            useListener('validate-order', () => this.validateOrderWithPrice(false)); // Listener para validar con precios
            useListener('print-both-tickets', () => this.printBothTickets()); // Añadir un listener para el nuevo botón
            this.validateOrderWithoutPrice = useAsyncLockedMethod(this.validateOrderWithoutPrice);
        }

        async printBothTickets() {
            try {
                const originalOrder = this.currentOrder;
                
                // Imprimir sin precios
                originalOrder.isWithoutPrice = true;
                await this.validateOrderWithoutPrice(false);

                // Esperar un pequeño tiempo para asegurar que la primera impresión se complete
                await this._waitFor(1000);

                // Crear una nueva orden con los mismos productos para imprimir con precios
                const newOrder = this.env.pos.add_new_order();
                
                // Copiar los productos de la orden original a la nueva orden
                for (let line of originalOrder.get_orderlines()) {
                    newOrder.add_product(line.product, {
                        quantity: line.quantity,
                        price: line.price,
                        discount: line.discount,
                    });
                }

                // Configurar la nueva orden para imprimir con precios
                newOrder.isWithoutPrice = false;
                newOrder.isTemporaryPrintOrder = true;

                // Cambiar a la nueva orden
                this.env.pos.set_order(newOrder);

                // Validar e imprimir la nueva orden con precios
                await this.validateOrderWithPrice(true);

                // Restaurar la orden original como la orden actual
                this.env.pos.set_order(originalOrder);
                
                // Marcar la orden temporal como finalizada
                newOrder.finalized = true;

                // Limpiar la orden temporal del historial de órdenes si es posible
                if (this.env.pos.db && typeof this.env.pos.db.remove_order === 'function') {
                    this.env.pos.db.remove_order(newOrder.id);
                }

            } catch (error) {
                console.error("Error al imprimir ambos tickets:", error);
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Error de impresión'),
                    body: this.env._t('No se pudieron imprimir ambos tickets. Verifique la conexión o los parámetros de la configuración.'),
                });
            }
        }

        _waitFor(milliseconds) {
            return new Promise(resolve => setTimeout(resolve, milliseconds));
        }

        async validateOrderWithoutPrice(isForceValidate) {
            if (this.env.pos.config.cash_rounding) {
                if (!this.env.pos.get_order().check_paymentlines_rounding()) {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Rounding error in payment lines'),
                        body: this.env._t("The amount of your payment lines must be rounded to validate the transaction."),
                    });
                    return;
                }
            }
            if (await this._isOrderValid(isForceValidate)) {
                // Configurar para imprimir sin precios
                this.currentOrder.isWithoutPrice = true;

                // Remover líneas de pago pendientes antes de finalizar la validación
                for (let line of this.paymentLines) {
                    if (!line.is_done()) this.currentOrder.remove_paymentline(line);
                }
                await this._finalizeValidation();
            }
        }

        async validateOrderWithPrice(isForceValidate) {
            if (this.env.pos.config.cash_rounding) {
                if (!this.env.pos.get_order().check_paymentlines_rounding()) {
                    this.showPopup('ErrorPopup', {
                        title: this.env._t('Rounding error in payment lines'),
                        body: this.env._t("The amount of your payment lines must be rounded to validate the transaction."),
                    });
                    return;
                }
            }
            console.log("Antes de _isOrderValid");
            if (await this._isOrderValid(isForceValidate)) {
                console.log("Orden válida, procediendo a finalizar");
                // Configurar para imprimir con precios
                this.currentOrder.isWithoutPrice = false;

                // Remover líneas de pago pendientes antes de finalizar la validación
                for (let line of this.paymentLines) {
                    if (!line.is_done()) this.currentOrder.remove_paymentline(line);
                }
                await this._finalizeValidation();
            }
        }

        async _finalizeValidation() {
            if ((this.currentOrder.is_paid_with_cash() || this.currentOrder.get_change()) &&
                this.env.pos.config.iface_cashdrawer &&
                this.env.proxy && this.env.proxy.printer) {
                this.env.proxy.printer.open_cashbox();
            }

            this.currentOrder.initialize_validation_date();
            for (let line of this.paymentLines) {
                if (line.amount !== 0) {
                    this.currentOrder.remove_paymentline(line);
                }
            }
            this.currentOrder.finalized = true;

            let syncOrderResult, hasError;

            try {
                this.env.services.ui.block();

                // Solo sincronizar si no es una orden temporal de impresión
                if (!this.currentOrder.isTemporaryPrintOrder) {															   
					// 1. Guardar el pedido en el servidor.
					syncOrderResult = await this.env.pos.push_single_order(this.currentOrder);

					// 2. Facturar.
					if (this.shouldDownloadInvoice() && this.currentOrder.is_to_invoice()) {
						if (syncOrderResult.length) {
							await this.env.legacyActionManager.do_action(this.env.pos.invoiceReportAction, {
								additional_context: {
									active_ids: [syncOrderResult[0].account_move],
								},
							});
						} else {
							throw { code: 401, message: 'Backend Invoice', data: { order: this.currentOrder } };
						}
					}

					// 3. Post-procesar.
					if (syncOrderResult.length && this.currentOrder.wait_for_push_order()) {
						const postPushResult = await this._postPushOrderResolve(
							this.currentOrder,
							syncOrderResult.map((res) => res.id)
						);
						if (!postPushResult) {
							this.showPopup('ErrorPopup', {
								title: this.env._t('Error: no internet connection.'),
								body: this.env._t('Some, if not all, post-processing after syncing order failed.'),
							});
                 
						}
					}
				}
            } catch (error) {
                this.env.services.ui.unblock();
                if (error.code == 700 || error.code == 701) {
                    this.error = true;
                }

                if ('code' in error) {
                    await this._handlePushOrderError(error);
                } else {
                    if (isConnectionError(error)) {
                        this.showPopup('OfflineErrorPopup', {
                            title: this.env._t('Connection Error'),
                            body: this.env._t('Order is not synced. Check your internet connection'),
                        });
                    } else {
                        throw error;
                    }
                }
            } finally {
                this.env.services.ui.unblock();
                // Decidir cuál pantalla mostrar según si es con o sin precio
                this.showScreen(this.nextScreen, { receiptWithoutPrice: this.currentOrder.isWithoutPrice });
                this.env.pos.db.remove_unpaid_order(this.currentOrder);

                if (!hasError && syncOrderResult && this.env.pos.db.get_orders().length) {
                    const { confirmed } = await this.showPopup('ConfirmPopup', {
                        title: this.env._t('Remaining unsynced orders'),
                        body: this.env._t('There are unsynced orders. Do you want to sync these orders?'),
                    });
                    if (confirmed) {
                        this.env.pos.push_orders();
                    }
                }
            }
        }

        async _postPushOrderResolve(order, order_server_ids) {
            const res = await super._postPushOrderResolve(...arguments);
            let result = await this.rpc({
                model: 'pos.order',
                method: 'get_giftcard_lines',
                args: [order_server_ids],
                kwargs: { context: session.user_context },
            });
            if (Object.keys(result.updated_lines).length) {
                for (const line of order.get_orderlines()) {
                    if (this.env.pos.config.gift_card_product_id[0] == line.product.id) {
                        const gclines = Object.values(result.updated_lines).filter((value) => value.price === line.price);
                        line.gift_card_code = gclines[0].gift_card_code;
                        line.gift_card_balance = gclines[0].gift_card_balance;
                    }
                }
            }
            return res;
        }
    };

    Registries.Component.extend(PaymentScreen, PosGCPaymentScreen);

    return PosGCPaymentScreen;
});
