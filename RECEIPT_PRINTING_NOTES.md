# Receipt printing notes (POS Loyalty Refund)

## Hallazgos clave

1. **No hay comandos ESC/POS de corte en este módulo**.
   - No se envían secuencias tipo `GS V` / `\x1d\x56` ni "post-print commands" para forzar corte.
2. **Sí hay lógica de ancho en frontend POS**.
   - Se usa `this.env.pos.config.receipt_width` para ajustar el ancho visual del recibo.
3. **Sí existe un formato de papel con alto fijo (no continuo) en reportes**.
   - En `data/gift_report.xml` se define `report.paperformat` con:
     - `format = custom`
     - `page_width = 80`
     - `page_height = 150`
   - Esto **no es "continuous roll"** ni "alto auto"; es una página de alto fijo para ese reporte.

## Dónde está cada cosa

- `static/src/js/OrderReceipt.js`
  - Ajuste de ancho de recibo en frontend (`receipt_width`).
- `models/pos_config.py` + `views/res_config_settings_view.xml`
  - Campo configurable de ancho del recibo.
- `static/src/scss/custom_receipt.scss`
  - Regla CSS fija de 220px para recibos de 58mm.
- `data/gift_report.xml`
  - Formato de papel custom con alto fijo de 150mm (Tarjeta Regalo).

## Conclusión para tu duda (alto auto / continuous roll)

- En este addon, **sí hay un sitio donde se fija el alto**: `data/gift_report.xml` (`page_height=150`).
- **No he encontrado ninguna opción o flag de "continuous roll" / "alto auto"** en este repositorio.
- Si el problema de corte afecta al ticket POS estándar (no al reporte de tarjeta regalo), el corte probablemente se decide en:
  1. Proxy/driver ESC/POS (IoT / hardware proxy), o
  2. Configuración interna de la impresora.
