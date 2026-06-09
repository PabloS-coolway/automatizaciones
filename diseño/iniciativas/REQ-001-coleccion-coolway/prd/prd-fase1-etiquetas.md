# PRD · REQ-001 Fase 1 — Motor de fichero de etiquetas (Coolway)

- **Estado:** 📐 Listo para construir · **Fecha:** 2026-06-08
- **Cadena:** [`diseño.md`](../diseño.md) → [`requerimientos.md`](../requerimientos.md) → **este PRD** → código (`apps/etiquetas-coolway/`)
- **Stack acordado:** Node + TypeScript + NestJS (hexagonal) · tests con Jest · validación con zod.

> Este PRD convierte el inventario de requerimientos (RF/RN/RD) en algo **accionable para un agente/dev**:
> alcance, contratos de datos, criterios de aceptación y casos de prueba con ground-truth real.

---

## 1. Objetivo y métricas de éxito

**Objetivo:** dado el **PDF de un pedido de compra SAP** + el **maestro de códigos** (`REFERENCIAS COOLWAY`), generar automáticamente el **fichero de etiquetas** del pedido (par y, si aplica, bultos), en la variante de códigos pedida, **sin inventar códigos de barra** y con **cuadre verificado** contra el PDF.

**Éxito (medible):**
- Reproduce **exactamente** el ground-truth `etiquetas_4603418_upc_ean.xlsx` (mismas filas, tallas, QTY, EAN13, UPC).
- 0 códigos de barra inventados; cualquier hueco → **aviso**, no relleno.
- Cuadre: Σ pares salida = Σ pares PDF (si no, reporta el descuadre).
- Tiempo de Silvia por pedido: de "comprobar fichero a fichero" → **subir 2 ficheros y revisar un informe**.

## 2. Usuarios
- **Primario:** Silvia (sin perfil técnico) — entrada PDF + maestro, salida Excel.
- **Secundario (futuro):** otros departamentos / un servicio automático (fuera de Fase 1).

## 3. Alcance

**Dentro (Fase 1):**
- Lectura del PDF de pedido de compra SAP (estructura tipo `4603418`).
- Lectura del maestro `REFERENCIAS COOLWAY.xlsx` (1 pestaña por modelo).
- Expansión de surtidos a pares por talla.
- Mapeo de referencias SAP ↔ YORGA y composición CODE128.
- Generación del **fichero de par** en las 4 variantes (SOLO EAN / SOLO UPC / CODE128+EAN / UPC+EAN).
- Generación del **fichero de bultos** cuando el pedido es en cajas surtidas.
- Informe de cuadre y de códigos faltantes.
- CLI asistida (`nest-commander`).

**Fuera (otras fases / DEP):**
- Acuñar SKU/referencias nuevas (es de Prepedidos/400).
- Generar EAN/UPC nuevos.
- Integración en vivo con Drive/SAP (DEP-02) → Fase posterior; ahora trabajamos sobre ficheros.
- Tarifas, plantillas de venta, BD maestra gobernada (Fases 2-4).
- Multi-marca (DEP-05).

---

## 4. Contratos de datos (el corazón del PRD)

### 4.1 Maestro `REFERENCIAS COOLWAY` (entrada · fuente de verdad)
Una hoja por modelo. Columnas reales:
| NAME | COLOR | REF. | SIZE | EAN 13 | SKU | COLOR NAME WEB | UPC |
|------|-------|------|------|--------|-----|----------------|-----|
| DUCK | BLK | 7604948 | 36 | 8433852462634 | 7604948-36 | WASHED BLACK | 810150671117 |

- **Clave de búsqueda:** `(STYLE, COLOR, SIZE, GÉNERO)` → fila del maestro, de la que se **leen** `REF., EAN13, UPC, SKU`. El **género** (chica `76…` / chico `86…`) se deriva del surtido (RN-04) y es imprescindible: las tallas solapadas 40-42 existen en ambas refs con **EAN distinto** pero **UPC igual**.
- ⚠️ **La `REF.` se lee fila a fila, NUNCA se reconstruye ni se asume constante.** El 3er dígito es el **color** (NILO GRN=`76`**`6`**`3398`, BRW=`76`**`4`**`3398`) y la ref puede **cambiar por talla** dentro del mismo color (BARESI FUX: 36-41=`7693164`, **42=`7693169`**).
- **Indexar** todas las hojas en memoria al arranque.

### 4.2 Pedido SAP (derivado del PDF)
Modelo objetivo por **línea**:
```ts
interface OrderLine {
  style: string;        // "NILO"
  color: string;        // "BRW"
  refSAP: string;       // "76033980200S36"
  assortment: string;   // surtido: "S36" | "I" | "KR" | "Z" | "P" | "S46" | "DEI" | "GRZ" ...
  sizeRange: string;    // "35/42"
  boxes: number;        // nº de cajas compradas
  pairsPerSize: Record<string, number>; // por talla, del surtido
}
```
> El PDF se lee con extracción por layout (columnas STYLE/COLOR/BOXES/ASS./PAIRS RANGE/matriz de tallas). Estructura estable (DEP-A6 a confirmar con Silvia).

### 4.3 Catálogo de surtidos (pares por talla)
Del PACK DETAIL del correo. Tabla de referencia (a externalizar como dato, no hardcode):
| Surtido | Género | Tallas → pares | Total |
|---|---|---|---|
| `00I` | W | 36:1 37:2 38:3 39:3 40:2 41:1 | 12 |
| `0KR` | W | 36:1 37:1 38:2 39:2 40:1 41:1 | 8 |
| `DEI` | W | 37:1 38:2 39:3 40:3 41:2 42:1 | 12 |
| `00Z` | M | 40:1 41:2 42:3 43:3 44:2 45:1 | 12 |
| `00P` | M | 40:1 41:1 42:2 43:2 44:1 45:1 | 8 |
| `S46` | M | 46:1 | 1 |
| `GRZ` | M | 41:1 42:2 43:3 44:3 45:2 46:1 | 12 |
| `Snn` | — | un par en la talla `nn` (pares sueltos) | 1 |

### 4.4 Salida · fichero de par
⚠️ **DECISIÓN ABIERTA (DEP-06):** existen **dos layouts reales** y hay que confirmar cuál es el entregable que consume la etiquetadora/cliente:

- **Layout A — prepedidos (rico)** `modelosEAN13...`: `STYLE, COLOR, SIZE, EAN, QTY, CODE128, REF, PROVIDER, STYLE2, ORDER, SIZE2`. Es el que hoy genera prepedidos (con códigos mal); el downstream probablemente espera ESTE.
- **Layout B — IA (simplificado)** `etiquetas_4603418...`: `style, color, ref., talla, SKU, QTY, ean13, upc`. Es el que Silvia validó como correcto en contenido.

Columnas de **código según variante** (aplican sobre el layout elegido): SOLO EAN → `ean13` · SOLO UPC → `upc` · CODE128+EAN → `code128, ean13` · UPC+EAN → `upc, ean13`.
- Una hoja `Etiquetas` + una hoja `Resumen` (cuadre). Un fichero **por pedido**.
- ⚠️ El layout A necesita `PROVIDER` (ej. 995), `STYLE2` (ej. `2003-1`) y `ORDER` (ej. `4603187000900000`), que **no están en el maestro** → fuente a confirmar (¿Access?).

### 4.5 Salida · fichero de bultos (solo cajas surtidas)
Columnas reales (de `4603292 bultos.txt`): `STYLE; COLOUR; BOX(surtido); SIZES; ASSORTMENT(pares+total); BAR CODE; PROVIDER`.
- ⚠️ La **composición del `BAR CODE` del bulto** (ej. `017460329276032970080KR`) no está documentada (mezcla pedido + ref SAP + surtido). Pedir la regla a IT/prepedidos antes de generarlo.

---

## 5. Flujo funcional (pipeline)

```
PDF pedido SAP ─┐
                ├─► [1] Parsear pedido (líneas: modelo/color/surtido/cajas)
maestro xlsx ──┐│
               ├┴► [2] Expandir surtido → pares/talla × cajas = QTY
               │   [3] Mapear refSAP → refYORGA (SKU) e indexar maestro
               │   [4] Resolver códigos (EAN13/UPC/CODE128) desde maestro
               │   [5] Aplicar reglas (UPC compartido, fusión por talla, orden)
               │   [6] Cuadre (Σ pares == PDF) + faltantes
               └─► [7] Escribir fichero par (variante) (+ bultos si surtido)
                   [8] Informe (Resumen)
```

## 6. Reglas de negocio (ver detalle en `requerimientos.md` RN-01..06)
- **RN-01** La ref YORGA y los códigos se **resuelven buscando en el maestro** por `(STYLE, COLOR, SIZE, GÉNERO)`; el PDF ya da STYLE+COLOR. La ref SAP **solo identifica la línea**, NO se usa para reconstruir la ref YORGA (su 3er dígito es 0; el de YORGA es el color). *(Corregido tras validación: el "ignorar 3er dígito" del correo era erróneo — real `7643398`, no `7623398`.)*
- **RN-02** `CODE128 = refYORGA + "00000" + talla`.
- **RN-03** `DEI = tallas 37–42`.
- **RN-04** I/KR → ref 76; Z/P → ref 86; nunca mezclar refs en una talla.
- **RN-05** si falta UPC en talla solapada (41/42) de ref chica → copiar UPC de ref chico.
- **RN-06** misma talla en **dos surtidos del MISMO (ref, género)** → una sola línea **sumando QTY** *(confirmar DEP-04)*. ⚠️ **Nunca fusionar entre géneros**: talla 40 chica (`76…`) y 40 chico (`86…`) son productos distintos (EAN distinto) → **dos líneas** (validado en pedido 4603187). Clave de dedupe = `(ref, talla)`.
- **RF-08** SKU vacío → componer `REF-talla` (nunca acuñar; EAN/UPC nunca se componen).

---

## 7. Criterios de aceptación

- **CA-1** Dado el PDF `4603418` + maestro, la salida en variante UPC+EAN es **idéntica** a `etiquetas_4603418_upc_ean.xlsx` (filas/tallas/QTY/ean13/upc).
- **CA-2** Si una talla aparece en dos surtidos del pedido, hay **una única fila** con la **suma** de QTY.
- **CA-3** Si un SKU del pedido no está en el maestro o le falta EAN/UPC, el sistema **lo lista en el informe** y **no** inventa ni deja la celda con un valor falso.
- **CA-4** El **CODE128** generado cumple `ref+00000+talla` (verificable contra `modelosEAN13 code 128-4603187.xlsm`).
- **CA-5** Σ pares de la salida == total de pares del PDF; si no, el Resumen marca el descuadre.
- **CA-6** Para un pedido de cajas surtidas se generan **par + bultos**; para pares sueltos, **solo par**.
- **CA-7** Pasar dos pedidos genera **dos ficheros**, nunca uno fusionado.

## 8. Casos de prueba (ground-truth en `docs/requerimientos/`)
| Caso | Input | Tipo | Qué valida |
|---|---|---|---|
| GT-1 | `4603418.pdf` + maestro | pares sueltos, NILO BRW | CA-1, CA-4, CA-5 (oráculo: `etiquetas_4603418_upc_ean.xlsx`) |
| GT-2 | pedido `4603187` | cajas surtidas, CODE128+EAN, 8444 pares | CA-4, CA-5, CA-6 (ref `modelosEAN13 code 128-4603187.xlsm` + bultos) |
| GT-3 | pedido `4603292` | cajas surtidas, UPC+EAN, 53 pares | CA-5, CA-6, RN-05 (ref `SPB modelosUPC EAN-4603292.xlsm` + bultos) |

> Pediremos a Silvia 2-3 ground-truth más (correo, punto 6) para ampliar la batería.

---

## 9. Arquitectura (NestJS hexagonal)

```
apps/etiquetas-coolway/
  src/
    domain/                      # CERO dependencias de Nest — testeable solo
      model/                     # OrderLine, LabelRow, Assortment, Reference (+ zod)
      services/
        reference-mapper.ts      # RN-01: SAP <-> YORGA
        code128.ts               # RN-02
        assortment-expander.ts   # RN-03, surtido -> pares/talla
        label-builder.ts         # RN-04..06, ensamblado de filas
        reconciliation.ts        # cuadre + faltantes (RF-11/12)
    application/
      ports/                     # interfaces (hexágono)
        order-reader.port.ts     # PDF -> OrderLine[]
        master-reader.port.ts    # xlsx -> índice de códigos
        label-writer.port.ts     # filas -> xlsx (par)
        bulto-writer.port.ts     # -> xlsx/txt (bultos)
        assortment-catalog.port.ts
      use-cases/
        generate-labels.use-case.ts
    infrastructure/              # adapters que implementan los ports
      pdf/   pdf-order-reader.ts        # pdfjs-dist
      excel/ excel-master-reader.ts     # exceljs
             excel-label-writer.ts      # exceljs
      catalog/ static-assortment-catalog.ts
    interface/
      cli/   generate-labels.command.ts # nest-commander
    app.module.ts
  test/
    fixtures/                    # copias del ground-truth
    *.spec.ts
  package.json  tsconfig.json  README.md
```

**Principio:** el **dominio** (reglas) no conoce ficheros ni Nest. Los **adapters** son intercambiables → cuando se resuelva DEP-02 (¿API Drive/SAP o ficheros?), se añade un adapter nuevo sin tocar el dominio. Empezamos por **CLI**; HTTP/cola más adelante reutiliza el mismo caso de uso.

**Librerías:** `@nestjs/core`, `nest-commander`, `exceljs`, `pdfjs-dist` (o `pdf-parse`), `zod`, `jest` + `ts-jest`.

## 10. Supuestos provisionales (confirmar con DEP)
- Código canónico = **Drive/Prepedidos** (DEP-01/A1).
- Talla en dos surtidos = **suma** (DEP-04/A3).
- Trabajo **offline** sobre copias de ficheros (DEP-02/A2/B2).
- El PDF SAP tiene **estructura estable** (A6).

## 11. Hitos
1. **Scaffold** NestJS hexagonal + tooling (Jest/zod/exceljs/pdfjs) + README.
2. **Dominio + tests** de reglas (RN-01..06) — sin IO, contra tablas conocidas.
3. **Adapters** de lectura (PDF, maestro) con fixtures reales.
4. **Caso de uso + writer** → reproducir GT-1 (oráculo) → verde.
5. **Bultos + variantes** → GT-2, GT-3.
6. **CLI** + informe de cuadre. Demo a Silvia.

## 12. Registro de validación (2026-06-08)
PRD contrastado contra ground-truth real (`REFERENCIAS COOLWAY.xlsx`, `etiquetas_4603418_upc_ean.xlsx`):
- ✏️ **RN-01 corregida:** la ref YORGA se **busca en el maestro** por `(STYLE,COLOR,SIZE,GÉNERO)`, no se reconstruye. Real NILO BRW = `7643398` (el correo decía `7623398`).
- ✏️ **Nuevo:** la `REF.` puede variar por talla dentro de un color (BARESI FUX 42=`7693169`) → leer fila a fila.
- ✏️ **Clave de búsqueda** ampliada con **GÉNERO (76/86)** por las tallas solapadas 40-42 (EAN distinto, UPC igual).
- ✅ Confirmados: esquema de salida, agregación de QTY (NILO BRW total 60), UPC compartido (RN-05), surtidos, CODE128.

**Segunda pasada (mismo día), tras abrir par/bulto de prepedidos + PDF completo:**
- ✅ **GT-1 cuadra al 100%:** PDF S36-S42 cajas `4,8,14,16,10,5,3` = QTY salida (total 60).
- ✅ **CODE128** verificado con datos: `7623425→76234250000036`, `8623832→86238320000040`.
- 🔴 **DEP-06 (nuevo):** dos layouts de salida reales (prepedidos rico vs IA simplificado) → confirmar cuál es el entregable.
- ✏️ **RN-06 acotada:** la suma es por `(ref, talla)`; NUNCA entre géneros 76/86 (talla 40 chica≠chico, EAN distinto — validado en 4603187).
- 🔴 **Gaps de datos** para layout rico: `PROVIDER`, `STYLE2`, `ORDER` no están en el maestro; composición del **barcode de bulto** sin documentar.

**Tercera pasada (ficheros nuevos de Silvia: 4603187/4603332/4603335 bultos + 4603434.pdf):**
- ✅ **2º PDF validado end-to-end** (4603434 NILO YEL, USA): 6 tallas, 60 pares, 0 faltantes → parser y lookup robustos en otro pedido/color/variante.
- ✅ **Barcode de bulto descifrado:** `017`+pedido+refSAP+color/surtido SAP+surtido (ej. `017460318776034250201I`). Embebe codificación **SAP**, no reproducible desde el maestro YORGA → **RF-17: bultos fuera de alcance, se mantienen en SAP**.
- 🟡 **DEP-06 sigue abierta:** los ficheros nuevos son **bultos**, no los **par/etiquetas marcados en verde**. Faltan para fijar columnas exactas del fichero de par.
