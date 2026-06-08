# REQ-001 · Qué pasar a Silvia/IT y con qué avanzamos ya

- **Estado:** 🔍 En análisis · **Fecha:** 2026-06-08
- **Relacionado:** [`diseño.md`](diseño.md) · [`requerimientos.md`](requerimientos.md)

> Objetivo de este doc: convertir las dependencias (DEP-01…05) en **preguntas concretas listas para enviar**,
> y separar claramente **lo bloqueado** de **lo que podemos empezar hoy sin esperar a nadie**.

---

## A. Preguntas para Silvia (negocio / comercial)

> Tono: ella conoce el flujo comercial al dedillo; no necesita lenguaje técnico. Listas para reenviar.

### A1 · El código de barra "oficial" (→ DEP-01)
- Cuando pasáis los códigos a un cliente y cuando se imprime la etiqueta, **¿el código bueno es SIEMPRE el del Drive (el que sale de Prepedidos)?** ¿Hay algún caso en que uséis el que genera SAP en el pedido de compra?
- *Por qué lo preguntamos:* hoy hay dos generadores y por eso "no cuadran". Necesitamos fijar **cuál manda** para que el sistema no tenga que adivinar.

### A2 · El Excel maestro del Drive (→ DEP-02, RD-04)
- ¿El maestro `REFERENCIAS COOLWAY` está **siempre actualizado y completo** justo antes de sacar etiquetas? ¿Quién lo mantiene?
- Cuando dices que "al principio hay modificaciones", **¿en qué momento se puede dar la colección por cerrada** (congelada) para automatizar con seguridad?
- ¿Está en **Google Sheets** o es un Excel guardado en Drive? ¿Nos puedes dar acceso a una copia para trabajar?

### A3 · Tallas que caen en dos surtidos (→ DEP-04)
- En un mismo pedido, si una talla aparece en **dos cajas/surtidos distintos**, en el fichero de etiquetas, **¿quieres una sola línea sumando las cantidades, o una por surtido?**
- *Nota:* en tu prueba con IA acabaste **sumándolas en una línea** — solo queremos confirmar que esa es la regla buena para todos los casos.

### A4 · Volumen y ritmo (→ DEP-03)
- ¿Cuántas **colecciones** sacáis al año y cuántos **pedidos de compra** necesitan etiquetas por temporada/mes? ¿Hay picos?
- *Por qué:* decide si construimos una **herramienta sencilla que usas tú** o un **servicio** más automático.

### A5 · Resto de marcas (→ DEP-05)
- Este flujo (Prepedidos → 400 → SAP → Drive) **¿es igual en Ulanka y Musse & Cloud**, o cada marca va a su manera?
- *Por qué:* si es el mismo, lo diseñamos una vez y sirve para todas.

### A6 · Detalle de las etiquetas
- Las 4 variantes (SOLO EAN / SOLO UPC / CODE128+EAN / UPC+EAN): **¿quién decide cuál se usa en cada pedido?** ¿El cliente?
- ¿El **PDF del pedido de compra de SAP** tiene SIEMPRE la misma estructura que el del 4603418? ¿Hay variantes según mercado?
- ¿Nos puedes pasar **2–3 ejemplos más** de pedidos con su fichero de etiquetas correcto (ground-truth), incluyendo alguno de **cajas surtidas** además de pares sueltos?

---

## B. Preguntas para IT (informáticos del 400 / SAP)

### B1 · Dueño del código de barra (→ DEP-01)
- ¿Por qué Prepedidos y SAP generan **códigos distintos** para el mismo SKU? ¿Cuál se considera oficial y se puede **dejar de regenerar** en el otro?

### B2 · Accesos programáticos (→ DEP-02)
- **SAP:** ¿hay API / servicio / export programable para sacar el pedido de compra (o ya solo PDF)?
- **Prepedidos / 400:** ¿se puede extraer SKU, surtidos y códigos por algo más que un export manual?
- **Drive:** ¿hay cuenta de servicio Google para leer/escribir el maestro automáticamente?

---

## C. Con qué avanzamos YA (no bloqueado)

> Tenemos en `docs/requerimientos/` **material real y validado** — no necesitamos esperar a nadie
> para construir y probar el motor de etiquetas. Trabajamos sobre **copias** de los ficheros que ya envió Silvia.

| # | Avance | Apoyado en | Requerimientos que cubre |
|---|---|---|---|
| C1 | **Contrato de datos del maestro** (esquema formal de columnas y claves) | `REFERENCIAS COOLWAY.xlsx` (37 modelos, columnas reales) | RD-01, RD-02, RD-03 |
| C2 | **Motor de reglas de transformación de referencias** con **tests** | reglas RN-01…05 (deterministas) | RN-01…05 |
| C3 | **Extractor del PDF de pedido SAP** (líneas: modelo/color/surtido/tallas/cajas) | `4603418.pdf` (`pdftotext` lo lee limpio) | RF-02, RF-03 |
| C4 | **Generador del fichero de etiquetas** + cuadre de pares | salida correcta `etiquetas_4603418_upc_ean.xlsx` como **oráculo de validación** | RF-01, RF-04, RF-05, RF-11, RF-12 |
| C5 | **Validación contra ground-truth**: reproducir exactamente la salida que Silvia ya dio por buena | pedidos 4603418 (pares) / 4603187 (CODE128+EAN) / 4603292 (UPC+EAN) | prueba de todo el flujo |

**Supuestos que asumimos mientras se cierran las DEP** (los marcamos como provisionales):
- Dueño canónico del código = **Drive/Prepedidos** (es lo que Silvia hace hoy) → confirmar con A1/B1.
- Talla en dos surtidos = **se suma** en una línea → confirmar con A3.
- Trabajamos **offline** sobre copias de ficheros (sin API) → revisar con A2/B2 al productizar.

### Lo que SÍ queda bloqueado hasta tener respuestas
- Integración **en vivo** con Drive/SAP (lectura/escritura automática) → DEP-02/B2.
- Decidir si es **script asistido o servicio** desplegado → DEP-03/A4.
- **Generalizar** a Ulanka/Musse → DEP-05/A5.

> **Estrategia:** construir el prototipo del motor con los supuestos de arriba y **validarlo contra el output que Silvia ya verificó**. Es la prueba más fuerte posible: si reproducimos su fichero bueno, el motor es correcto — y se lo enseñamos como entregable tangible mientras llegan las respuestas.
