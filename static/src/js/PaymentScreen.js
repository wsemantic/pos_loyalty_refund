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
                // Primero imprimir sin precios
                await this.validateOrderWithoutPrice(false);

                // Esperar un pequeño tiempo para asegurar que la primera impresión se complete
                await this._waitFor(1000);

                // Luego imprimir con precios
                await this.validateOrderWithPrice(false);
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
            if (await this._isOrderValid(isForceValidate)) {
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
                            ti
