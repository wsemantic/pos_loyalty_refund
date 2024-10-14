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
                
                // Imprimir con precios primero
                originalOrder.isWithoutPrice = false;
                await this.validateOrderWithPrice(false);
                await this._printReceipt();

                // Crear una nueva orden con los mismos productos para imprimir sin precios
                const newOrder = this.env.pos.add_new_order();
                
                // Copiar los productos de la orden original a la nueva orden
                for (let line of originalOrder.get_orderlines()) {
                    newOrder.add_product(line.product, {
                        quantity: line.quantity,
                        price: line.price,
                        discount: line.discount,
                    });
                }

                // Agregar un método de pago temporal si no hay líneas de pago
                if (newOrder.get_total_with_tax() != 0 && newOrder.get_paymentlines().length === 0) {
                    let paymentMethod = this.env.pos.payment_methods.find(method => method.is_cash_count);
                    if (!paymentMethod) {
                        paymentMethod = this.env.pos.payment_methods[0]; // Seleccionar el primer método de pago si no se encuentra efectivo
                    }
                    const paymentline = newOrder.add_paymentline(paymentMethod);
                    paymentline.set_amount(newOrder.get_total_with_tax());
                }

                // Configurar la nueva orden para imprimir sin precios
                newOrder.isWithoutPrice = true;
                newOrder.isTemporaryPrintOrder = true;

                // Cambiar a la nueva orden y esperar a que el DOM esté listo
                this.env.pos.set_order(newOrder);
                await this._waitForOrderReady();

                // Validar e imprimir la nueva orden sin precios
                await this.validateOrderWithoutPrice(true);
                await this._printReceipt();

                // Restaurar la orden original como la orden actual
                this.env.pos.set_order(originalOrder);
                await this._waitForOrderReady();
                
                // Marcar la orden temporal como finalizada y eliminarla del POS
                newOrder.finalized = true;
                if (this.env.pos.db && typeof this.env.pos.db.remove_order === 'function') {
                    this.env.pos.db.remove_order(newOrder.id);
                }
                this.env.pos.get_order_list().splice(this.env.pos.get_order_list().indexOf(newOrder), 1);

            } catch (error) {
                console.error("Error al imprimir ambos tickets:", error);
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Error de impresión'),
                    body: this.env._t('No se pudieron imprimir ambos tickets. Verifique la conexión o los parámetros de la configuración.'),
                });
            }
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
            // No se eliminan las líneas de pago para mantener el historial de pagos
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
                await this.showScreen(this.nextScreen, { receiptWithoutPrice: this.currentOrder.isWithoutPrice });
                this.env.pos.db.remove_unpaid_order(this.currentOrder);
                this.env.pos.get_order_list().splice(this.env.pos.get_order_list().indexOf(this.currentOrder), 1);

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

        async _printReceipt() {
            // Función para imprimir el recibo de la orden actual
            try {
                if (this.env.proxy && this.env.proxy.printer) {
                    await this.env.proxy.printer.print_receipt(this.currentOrder.export_for_printing());
                } else {
                    await this.showScreen('ReceiptScreen');
                }
            } catch (error) {
                console.error("Error al imprimir el recibo:", error);
                this.showPopup('ErrorPopup', {
                    title: this.env._t('Error de impresión'),
                    body: this.env._t('Hubo un problema al imprimir el recibo. Intente nuevamente.'),
                });
            }
        }

        async _waitForOrderReady() {
            // Espera un momento para asegurarse de que la orden y el DOM estén listos
            await new Promise(resolve => setTimeout(resolve, 500));
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