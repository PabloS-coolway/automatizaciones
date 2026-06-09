# etiquetas-coolway-web

Front (React + Vite + react-bootstrap) para generar etiquetas Coolway: sube el/los PDF(s) de pedido de compra SAP + el Excel maestro, elige el destino y descarga los ficheros.

## ⚠️ Qué subir (importante)

| Campo del formulario | Qué fichero es | Ejemplos en `docs/requerimientos/` |
|---|---|---|
| **Excel maestro** | `REFERENCIAS COOLWAY.xlsx` — la base de datos de códigos (una pestaña por modelo). **Uno** por temporada. | `REFERENCIAS COOLWAY.xlsx` |
| **PDFs de pedido de compra** | Los pedidos de compra de **SAP** (uno o varios = batch). | `4603418.pdf`, `4603434.pdf` |

> El resto de ficheros de `docs/requerimientos/` (los `*.xlsm`, `*bultos.txt`, `etiquetas_*.xlsx`, imágenes) **no se suben**: son ejemplos / ground-truth / bultos (los bultos van por SAP, fuera de alcance).

## Desarrollo
```bash
# desde la raíz del monorepo, levanta API + web:
npm run dev            # turbo: api en :3000, web en :5173 (o :5174 si el 5173 está ocupado)
# o solo el front (necesita la API en :3000):
npm run dev -w @yorga/etiquetas-coolway-web
```
Vite redirige `/api` → `http://localhost:3000` (la API NestJS).

## Arquitectura (hexagonal / DDD)

```
src/
  domain/         # modelo + validación (puro, sin framework)
  application/
    ports/        # LabelsGateway, FileDownloader (interfaces)
    use-cases/    # loadMarkets, generateLabels, download… (sin React ni fetch)
  infrastructure/ # adapters: HttpLabelsGateway (fetch), BrowserFileDownloader
  ui/             # React: App, componentes, hook useLabels, composition (raíz)
```

El dominio y los casos de uso no conocen React ni HTTP; la UI y el `fetch` son adapters intercambiables. Tipos compartidos con la API en [`@yorga/contracts`](../../packages/contracts/).
