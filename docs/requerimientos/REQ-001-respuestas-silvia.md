# Fuente · Respuestas de Silvia a las preguntas de REQ-001

- **De:** Silvia Mayordomo · **Fecha:** ~junio 2026 (respuesta al correo de Pablo)
- Respuestas intercaladas a las 7 preguntas + adjuntos nuevos.

## Respuestas

1. **Código oficial** → **Siempre el del Drive** (los que genera desde Prepedidos antes de sacar la colección). Los pedidos de compra se hacen 1-2 meses después. *(Resuelve DEP-01: maestro Drive = autoridad.)*

2. **Maestro** → Lo mantiene **ella, a mano** (quiere automatizarlo). Riesgo real: como acceden varios departamentos, **a veces se borran códigos** y le toca recuperarlos de ficheros antiguos. **Congelación:** la colección se da por cerrada **una vez se mandan los muestrarios y las plantillas de ventas**; después no debería haber cambios, salvo **añadir un modelo o color nuevo**. Es un **Excel en Drive** (no Google Sheets). Copia compartida: `https://docs.google.com/spreadsheets/d/11ncixa3TJAHVzyE0y9qZsm7EjN9CS_u2/edit`

3. **Tallas en dos surtidos** → **Mismo SKU = una línea sumando.** Pero **SKU chica (ref 76) y chico (ref 86) = dos líneas con códigos diferentes.** *(Confirma RN-06 tal cual la implementamos.)*

4. **Volumen** → **2 temporadas/año**; **todos** los pedidos de compra necesitan etiquetas; ej. invierno 2026 = **285 pedidos**. **Picos/bloques:** suele sacar etiquetas en bloque por **mismo código de barras + mismo cliente** (ej. UPC+EAN de todos los pedidos de un cliente).
   - 🆕 **Nueva columna `importado por`:** los pedidos que vienen a Valencia → **"importado por VANYOR"**; los que van a USA → **"importado por COOLWAY USA"**.

5. **Resto de marcas** → **Musse & Cloud:** mismo flujo (colección comercializada). **Ulanka:** solo algunos modelos (los comercializados) = mismo flujo; el resto de compras de tienda de Ulanka **no entran en Drive ni SAP**.

6. **Variantes / formato** → Decide Yorga, a veces el cliente:
   - **Almacén Valencia (tiendas):** doble etiquetaje **CODE128 + EAN** (CODE128 para nuestras tiendas, EAN para el resto) — así no reetiquetan.
   - **USA:** doble etiquetaje **UPC + EAN**.
   - **Distribuidores/partners (un único código):** Australia = **UPC**; Italia, UK, Costa Rica… = **solo EAN**.
   - **PDF de SAP:** SIEMPRE la misma estructura. *(Resuelve DEP-A6.)*
   - **Etiquetas de bulto:** SIEMPRE **CODE128** (para la cinta del almacén) y **se sacan desde SAP**.

7. **IT** → Hablar con **Tomás Sánchez** <tomas@grupoyorga.com> (por qué Prepedidos y SAP generan códigos distintos; extracción automática).

## Segundo correo (aclaración formato — resuelve DEP-06)

- **Formato del fichero de par:** prefiere **el simple** (`ref, talla, SKU, ean13, upc`). El de prepedidos tiene columnas que "no se necesitan o están duplicadas". La etiquetadora **se acopla a lo que le mandemos** y solo imprime esos campos.
- **PROVIDER (995):** olvidarlo, no se usa.
- **ORDER:** es el nº de pedido de compra (sale en el PDF); **no necesario**.
- **Barcode de bulto:** lo hace **SAP y sale bien** (no lo rectifica). Composición confirmada: `017` (código almacén) + pedido compra SAP (`4603334`) + ref SAP (3er dígito 0: `76033980`) + `890` (color amarillo en SAP) + `00I` (surtido).
- **Bultos = críticos:** al llegar contenedores pasan por la cinta y los códigos (de SAP) **dan entrada al pedido de compra** leyendo las cajas. Por eso van con los de SAP. → **RF-17 confirmado: bultos fuera de alcance.**

## Adjuntos (1ª tanda; de momento llegaron solo los de bulto + 4603434.pdf)
- **4603187** · CODE128+EAN · importado por VANYOR · tiendas · **fichero de SAP**. Lleva una columna con nº pedido + **precio camuflado** → **quitar**; **añadir "importado por"** (hoy no sale). Silvia marcó **en verde** las columnas necesarias.
- **4603332** · AUSTRALIA · UPC+EAN · fichero de par sacado por IA · importado por cliente Australia.
- **4603335** · ITALIA · SOLO EAN · fichero de par desde SAP · importado por cliente Italia.
- **4603434** · USA · UPC+EAN · **pares sueltos** (solo fichero de par, sin bulto).
