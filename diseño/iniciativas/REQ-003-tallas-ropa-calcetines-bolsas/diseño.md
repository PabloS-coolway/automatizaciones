# REQ-003 · Etiquetar ropa, calcetines y bolsas: el SKU tiene TRES tallas

- Estado: ✅ Hecho · Fecha: 2026-07-13 · Implementado: 2026-07-14
- Área: Catálogo

## Problema de negocio

La herramienta sólo sabe etiquetar **calzado**, donde la talla es una y la misma en todas partes: el PDF
del pedido dice `40`, el código de barras lleva `40` y la etiqueta imprime `40`.

En **ropa, calcetines/cordones y bolsas/gorras eso no se cumple**: un mismo SKU tiene **tres tallas
distintas**, y confundirlas produce una etiqueta con el **código de barras equivocado** — que en tienda
significa cobrar el producto que no es.

| Familia | Talla **SAP** (viene en el PDF) | Talla **tiendas** (va al código de barras) | **Size** (se imprime en la etiqueta) |
|---|---|---|---|
| Calzado | 36, 37, 38… | *(la misma)* | 36, 37, 38… |
| **Ropa** | 31, 32, 33, 34 | 11, 12, 13, 14 | S, M, L, XL |
| **Calcetines / cordones** | 31, 32, 33 | 11, 12, 13 | 36-38, 39-41, 42-45 |
| **Bolsas / mochilas / gorras** | C01 | 35 | U |

Ejemplo real del maestro (hoja `BOLSAS MOCHILAS GORRAS`):

```
STYLE    COLOR  REF.    SIZE  TALLA SAP  EAN 13         TALLA TIENDAS  UPC
SYA CAP  RED    556596  U     C01        8433852613821  35             843385224346
```

**A quién duele:** a Silvia. Estos productos hoy **no se pueden etiquetar con la herramienta**: los hace a
mano, que es exactamente el trabajo que vinimos a eliminar. Y son categorías en crecimiento (la colección
trae ropa, calcetines y gorras).

**Ojo con el matiz que se ve en la tabla:** el puente `31 → 11` es **el mismo** en ropa y en calcetines,
pero la talla impresa **cambia según la familia** (`S` vs `36-38`). Es decir: **la traducción NO se puede
hacer con una tabla fija en el código**. Hay que leerla del maestro, fila a fila. Que es justo la regla de
oro del proyecto: *el maestro es la única autoridad; se lee, no se inventa*.

## Sistemas afectados (entradas / salidas / dueño del dato)

| | |
|---|---|
| **Entrada 1** | **PDF de pedido de SAP** (dueño: SAP). Trae la **talla SAP** (`31`, `C01`) y las cajas/surtido. |
| **Entrada 2** | **Excel `REFERENCIAS COOLWAY`** (dueño: Silvia). Trae las **tres tallas** por SKU, ya en columnas separadas: `SIZE`, `TALLA SAP`, `TALLA TIENDAS`. |
| **Almacén** | **Postgres** (dueño: la app; sólo ella escribe). Hoy guarda **una** talla por fila → hay que ampliarlo. |
| **Salida** | El **fichero de etiquetas**: imprime `SIZE` y compone el CODE128 con la **talla tiendas**. |
| **Dueño del dato** | Sin cambios: el maestro sigue siendo la autoridad. **No se crea ninguna fuente de verdad nueva.** |

**Dato que se consume:** dos columnas del Excel que **hoy se están tirando a la basura** al cargar
(`TALLA SAP` y `TALLA TIENDAS`). **Dato que se produce:** ninguno nuevo — sólo etiquetas correctas.

## Encaje arquitectónico

Cae en **Catálogo**, y toca las cuatro capas de la API (dominio, aplicación, infraestructura, interfaz)
más una **migración**. Respeta los principios: no duplica dato, no crea una segunda fuente de verdad, y
**refuerza** el principio de *dato primero* — el problema es que el modelo de datos está incompleto.

**La fricción real, y es conceptual:** hoy el dominio asume que **"talla" es una sola cosa**. Ese supuesto
está metido en la clave del maestro `(ref, talla)`, en la búsqueda del `MasterIndex`, en el `label-builder`
y en `buildCode128(ref, size)` (RN-02). El requerimiento no es "añadir dos columnas": es **reconocer que
`talla` son tres conceptos distintos** y darles nombre.

**Riesgo de no hacerlo bien:** si la búsqueda se hace por la talla equivocada, el sistema **no falla — miente**:
imprime una etiqueta con el código de barras de otra talla. Es la misma familia de bugs que ya nos ha
mordido cuatro veces (el parser que se comía 798 pares, el filtro que miraba 100 filas de 5.736…). Aquí el
coste es peor: producto mal cobrado en tienda.

### Estado del dato en el maestro (auditado hoy)

| Hoja | Cabeceras | Situación |
|---|---|---|
| `CALCETINES Y CORDONES` | `SIZE`, `TALLA SAP`, `TALLA TIENDAS` | ✅ Correcta |
| `BOLSAS MOCHILAS GORRAS` | `SIZE`, `TALLA SAP`, `TALLA TIENDAS` | ✅ Correcta |
| **`ROPA`** | col.4 dice `SIZE` pero contiene `11,12,13`; col.5 **sin cabecera** contiene `31,32,33`; col.6 dice `SIZE` y contiene `S,M,L,XL`; la columna `TALLA TIENDAS` está **vacía** | ❌ **Mal etiquetada.** Los datos están; los rótulos, no. |
| `LLAVEROS Y CLEANER` | cabecera en la **fila 2** (la 1 está vacía), formato propio (`SIZE = 00U`) | ❌ **No se carga**: nunca ha entrado en la BD |

**9 referencias de ropa no tienen talla tiendas** (celda vacía): `GOALWAY` (NAV/RED/WHT), `DUAL` (NAV/WHT),
`TRACE` (GRN/ICE), `SPLIT GRN`, `RULOPANT BEI`. Sin ese código **no se puede componer el código de barras**:
se reportan, nunca se inventan (RF-12).

## Opciones y recomendación

### Opción A — Tres columnas en el maestro ✅ **recomendada**
`reference` pasa a tener `size` (la que se imprime), `tallaSap` (la del PDF) y `tallaTiendas` (la del
código de barras). En calzado, las tres coinciden y se rellenan con el mismo valor.
- La búsqueda al generar pasa a hacerse por **`tallaSap`** (que es lo que trae el PDF).
- `buildCode128` recibe la **talla tiendas**, no la talla impresa.
- ✅ El dato queda **explícito**: cada talla tiene nombre y dueño. Se acabó el "¿qué talla es esta?".
- ✅ Funciona igual para calzado (sin excepciones ni `if`) y deja el sistema listo para la siguiente familia.
- ❌ Migración + tocar dominio, carga y generación. Es el trabajo honesto.

### Opción B — Una tabla de conversión en el código (31→11→S)
- ✅ Cambio pequeño, sin migración.
- ❌ **Es un bug esperando a ocurrir.** El mismo `31 → 11` acaba en `S` (ropa) o en `36-38` (calcetines):
  la tabla dependería de la familia de producto, un concepto que **no existe** hoy en el modelo. Y en cuanto
  Silvia añada una talla nueva, habría que tocar código.
- ❌ Viola la regla de oro: **inventa** una traducción que el maestro ya tiene escrita.

### Opción C — Sólo ropa ahora, el resto después
- ✅ Entrega antes.
- ❌ El coste está en el **modelo**, y es el mismo para las tres familias. Trocearlo obliga a migrar dos veces.

**Recomendación: opción A.** Y una decisión de producto que la refuerza: al cargar el maestro, **avisar** de
las referencias sin talla tiendas (como ya avisamos de los EAN compartidos), en vez de descubrirlo al generar.

## ✅ Bloqueantes resueltos (Silvia, 14/07/2026) — validado contra los 6 PDFs reales

Silvia envió **6 pedidos de prueba** (`docs/requerimientos/validaciones/14-07-2026/`), que cubren las tres
familias y las dos variantes de códigos:

| Pedido | Familia | Modelos | Códigos | Declara |
|---|---|---|---|---|
| `ORDER 4603015` | Ropa | ICONIC, WASHED | CODE128 + EAN | 1.280 cajas / 1.280 pares |
| `ORDER 4603016` | Ropa (los mismos) | ICONIC, WASHED | **UPC + EAN** | 1.220 / 1.220 |
| `4603670` | Calcetines + ropa | KNIT, ZEBRA | CODE128 + EAN | 1.000 / 1.000 |
| `4603671` | Ropa | STORM | CODE128 + EAN | 200 / 200 |
| `4602991` | Mochila | BACKPACK | CODE128 + EAN | 750 / 750 |
| `4602992` | Mochila (la misma) | BACKPACK | **UPC + EAN** | 250 / 250 |

**El parser los lee ENTEROS**: en los seis, las líneas y las cajas cuadran con el total que declara el
propio PDF. Cero líneas perdidas — que era el riesgo nº1 con un formato nuevo.

### 1. La regla del CODE128 (RN-02) — RESUELTA
> *"Todas las referencias que tengan un dígito menos, como en este caso, debe añadir un cero delante."*

La ref YORGA se **rellena con ceros por la izquierda hasta 7 dígitos** antes de componer el CODE128. La
mochila (`308280`) pasa a `0308280`, y el código vuelve a tener 14 dígitos. **El PDF lo confirma**: su ref
SAP es `03082800000C01` — el cero delante **ya viene puesto por SAP**.

### 2. Cómo vienen estas familias en el PDF — DESCUBIERTO EN LOS PDFs

| Familia | Surtido en el PDF | Rango | Unidades por caja |
|---|---|---|---|
| Ropa y calcetines | `S31`, `S32`, `S33`, `S34` | `16/35` | 1 |
| Mochilas / bolsas | **`C01`** | `XS/U` | 1 |

- Los `S<nn>` **ya los entiende el parser** (patrón de "par suelto"), y su `nn` **es la talla SAP** (31…34).
  Encaja: 1.000 cajas = 1.000 pares.
- **`C01` es un surtido nuevo**: 1 unidad por caja. Y a la vez es **la talla SAP** de las bolsas.

## ⚠ Defectos de datos encontrados en el maestro (para Silvia)

1. **`BACKPACK` tiene `SIZE = 35` en vez de `U`.** En la hoja `BOLSAS MOCHILAS GORRAS`, la fila de BACKPACK
   repite en `SIZE` la talla tiendas (`35`) en lugar de la talla que se imprime (`U`), que sí está bien en
   las demás filas (`SYA CAP`, `C CAP`). Tal cual, **la etiqueta imprimiría "35"**.
2. **`BACKPACK` no tiene UPC**, y el pedido **4602992 va a USA** (que exige UPC + EAN). Se reportará como
   faltante — no se inventa.
3. **La hoja `ROPA` sigue mal rotulada** (ver arriba). Es lo único que impide mapear sus tres tallas por
   nombre de cabecera, como sí se puede en `CALCETINES` y `BOLSAS`.

## Preguntas abiertas y riesgos

1. **La regla del CODE128 (RN-02).** Hoy es `ref + 00000 + talla` (7+5+2 = 14 díg.). Con ropa daría
   `9008524` + `00000` + `11` = `90085240000011` ✅. Pero **las bolsas tienen la ref más corta** (`556596`,
   6 dígitos) → `556596` + `00000` + `35` = `5565960000035` (13 díg.). **¿Es correcto, o el formato cambia
   para estas familias?** ⚠️ Bloqueante: un CODE128 mal formado es una etiqueta inservible.
2. **La hoja `ROPA` está mal rotulada.** Lo limpio es que **Silvia le ponga las mismas cabeceras** que a
   `CALCETINES` y `BOLSAS` (un minuto). La alternativa —leerla por posición— es frágil: se rompe el día que
   alguien inserte una columna. **Recomendación: pedirle que la normalice.**
3. **Las 9 referencias de ropa sin talla tiendas**: ¿las rellena Silvia, o esos productos no se etiquetan?
4. **Llaveros y cleaner**: hoy **no entran** en la BD (cabecera en la fila 2, formato propio). ¿Están en el
   alcance de este REQ o se dejan fuera?
5. **⚠️ NO tenemos ningún PDF de pedido con ropa, calcetines o bolsas.** Sin una muestra real estaríamos
   **adivinando** cómo vienen las líneas, los surtidos y la rejilla de tallas (¿columnas 31-34?). Ya sabemos
   cómo acaba eso: el parser se comió 798 pares del pedido 4603662 por un color con guión, y no lo vimos
   hasta contrastar con el total del propio PDF. **Bloqueante para implementar.**
6. **Riesgo del catálogo de surtidos**: las cajas de ropa traerán surtidos que no conocemos (como pasó con
   `M<nn>`, `D`, `CD`, `DE4`). Se sabrá sólo con un pedido real.

## Próximos pasos

1. **Conseguir un PDF de pedido real con ropa / calcetines / bolsas.** Es lo que desbloquea todo lo demás.
2. **Confirmar con Silvia**: la regla del CODE128 para refs cortas (bolsas), la normalización de las
   cabeceras de `ROPA`, las 9 refs sin talla tiendas, y si llaveros entra en el alcance.
3. Con eso, cerrar la opción A y detallar la migración + el contrato del maestro.
4. Recién entonces, implementar. **Primero el dato, luego el código.**
