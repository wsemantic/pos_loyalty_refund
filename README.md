# POS Loyalty Refund - Notas de flujo (resumen)

## Idea clave
- El vínculo **línea POS ↔ tarjeta regalo** se crea en backend en `confirm_coupon_programs`.
- `_postPushOrderResolve` (frontend) **no crea** tarjetas ni puntos: solo lee/mapea lo ya calculado en backend.

## Flujo mínimo
1. POS valida pedido/abono.
2. Backend ejecuta `confirm_coupon_programs`:
   - crea/actualiza `loyalty.card`,
   - enlaza `gift_card_id` en líneas de producto de tarjeta regalo.
3. Frontend ejecuta `_postPushOrderResolve` y llama a `get_giftcard_lines`.
4. Con ese payload, rellena `line.gift_card_id` en el pedido del cliente para impresión.
5. El ticket imprime código/saldo si `line.gift_card_code` está presente.

## Por qué hace falta "match por importes"
- En un abono puede haber **más de una línea relacionada con tarjeta**:
  - una línea por **emitir** nueva tarjeta (devolución),
  - y otra(s) por **consumir** tarjeta anterior (pago/recompensa).
- Si solo se "coge una línea de tarjeta" sin criterio, se puede enlazar el código equivocado.
- El match por importe intenta enlazar cada `loyalty.card` creada con la línea de emisión correcta.

## Criterios de match
- Se compara contra subtotal **sin** y **con** impuestos (`price_subtotal` / `price_subtotal_incl`) con tolerancia.
- Esto evita fallos por redondeo/impuestos (puntos vs importe de línea).
- Si no hay relación en backend (`gift_card_id`/`coupon_id`), el frontend no puede inventarla.

## Depuración rápida
- Navegador (con `localStorage.pos_giftcard_debug=1`): revisar `RPC get_giftcard_lines`.
- Servidor: buscar logs `[pos_loyalty_refund]` en `confirm_coupon_programs` y `get_giftcard_lines`.
