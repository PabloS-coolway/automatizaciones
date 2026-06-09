# etiquetas-coolway · REQ-001 Fase 1

Motor de generación del **fichero de etiquetas** de Coolway a partir del PDF de pedido de compra SAP + el maestro `REFERENCIAS COOLWAY`. Arquitectura **hexagonal** sobre **NestJS** (TypeScript).

> Diseño y reglas: [`../../diseño/iniciativas/REQ-001-coleccion-coolway/`](../../diseño/iniciativas/REQ-001-coleccion-coolway/) (PRD, requerimientos, flujo).

## Principio

El maestro es la **única autoridad** de códigos de barra: el motor **busca y lee, nunca inventa**. Si falta un dato, **avisa**.

## Estructura (hexagonal)

```
src/
  domain/         # reglas puras, CERO dependencias de framework
    model/        # tipos + esquemas zod
    services/     # code128, surtidos, género, master-index, label-builder, cuadre
  application/
    ports/        # interfaces (order-reader, master-reader, label-writer)
    use-cases/    # generate-labels.use-case
  infrastructure/ # adapters (PDF, Excel) — pendiente (hito 3)
  interface/      # CLI nest-commander — pendiente (hito 6)
test/             # tests del dominio contra ground-truth
```

## Comandos

```bash
npm install
npm test        # tests del dominio
npm run typecheck
```

## Uso (CLI)

```bash
npm start -- generate \
  -o "../../docs/requerimientos/4603418.pdf" \
  -m "../../docs/requerimientos/REFERENCIAS COOLWAY.xlsx" \
  -O "/tmp/etiquetas.xlsx" \
  -v UPC_EAN          # EAN | UPC | CODE128_EAN | UPC_EAN
```

## Estado

- ✅ Hitos 1-6: scaffold + dominio + adapters (PDF/Excel) + NestJS/CLI + writer.
- ✅ **Validado end-to-end contra ficheros reales:** reproduce exacto `etiquetas_4603418` (7 filas, 60 pares, cuadre OK). 24 tests en verde.
- ⏳ Pendiente **DEP-06** (Silvia): el writer usa un layout provisional (formato simplificado + Resumen); el formato final solo afecta a `excel-label-writer.adapter.ts`.
- ⏳ Pendiente endurecer el parser de PDF con más muestras (DEP-A6) y, opcionalmente, migrar el extractor de `pdftotext` a pdfjs puro.
