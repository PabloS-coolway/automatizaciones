# Changelog

Registro de avances del proyecto de automatizaciones de Yorga.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/).

## [2026-06-09] Front: UI con Bootstrap + arquitectura hexagonal/DDD

### Añadido
- **react-bootstrap + bootstrap**: UI rediseñada (cards, formulario con ayudas, tabla con badges de cuadre, botones de descarga).
- Nota en el README del front: **qué subir** (maestro `REFERENCIAS COOLWAY.xlsx` vs PDFs de pedido de compra SAP).

### Cambiado
- Front reestructurado a **hexagonal/DDD**: `domain/` (modelo + validación), `application/` (ports + use-cases sin React/fetch), `infrastructure/` (HttpLabelsGateway, BrowserFileDownloader), `ui/` (componentes + hook `useLabels` + composición). El dominio y los casos de uso no conocen React ni HTTP.

## [2026-06-09] Monorepo + API HTTP + Front web

### Añadido
- **Monorepo** con npm workspaces + **Turborepo** (`turbo.json`, `apps/*` + `packages/*`).
- **`packages/contracts`** (`@yorga/contracts`): tipos/contratos compartidos por API y front (`LabelVariant`, `MarketCode`, `MARKETS`, DTOs). Fuente única de verdad de tipos.
- **API HTTP** en `etiquetas-coolway-api` (`interface/http/`): `GET /api/health`, `GET /api/markets`, `POST /api/labels/generate` (**batch**: varios PDFs + maestro → un Excel por pedido en base64). Validada con ficheros reales (2 PDFs, cuadre OK).
- **Front `etiquetas-coolway-web`** (React + Vite): subir PDFs + maestro, elegir destino, ver cuadre/faltantes y descargar los Excel.
- Caso de uso refactorizado a **batch** (lee el maestro una vez) + **serializador** de Excel desacoplado (reutilizado por CLI y HTTP).

### Cambiado
- `apps/etiquetas-coolway` → **`apps/etiquetas-coolway-api`** (git mv, historial preservado).
- Eliminado `pdfjs-dist` (no usado; el PDF se extrae con `pdftotext`).

## [2026-06-09] REQ-001 Coolway — Fase 1 (fichero de etiquetas)

### Añadido
- **App `apps/etiquetas-coolway/`** (NestJS + TypeScript, arquitectura hexagonal): motor que genera el fichero de etiquetas a partir del PDF de pedido de compra SAP + el maestro `REFERENCIAS COOLWAY`.
  - Dominio puro con reglas RN-01..06 (CODE128, surtidos, género 76/86, dedupe por `(ref,talla)`, UPC compartido) + cuadre de pares.
  - Adapters: lector de PDF (parser SAP), lector de Excel maestro, writer de Excel.
  - CLI (`nest-commander`) con preset destino→variante (`--market`) y columna `importado por`.
  - **30 tests** (incl. end-to-end contra ficheros reales 4603418 y 4603434). Reproduce exacto la salida validada por Silvia.
- **Diseño REQ-001** completo en `diseño/iniciativas/REQ-001-coleccion-coolway/`: `diseño.md`, `requerimientos.md`, `acciones.md`, `correo-silvia.md`, `flujo.md` (+ diagramas PNG), `prd/prd-fase1-etiquetas.md`.
- **Fuentes** en `docs/requerimientos/`: correos de Silvia + ficheros reales (PDFs, maestro, bultos, ejemplos).

### Decidido / resuelto
- Stack: **Node + TypeScript + NestJS hexagonal**; tests con Jest.
- **DEP-01..06 y A6 resueltas** con Silvia: maestro del Drive = fuente de verdad; formato de salida **simplificado**; preset por destino (Valencia=CODE128+EAN, USA=UPC+EAN, Australia=UPC, Italia/UK/CR=EAN); columna `importado por`.
- **RF-17:** las etiquetas de **bulto se mantienen en SAP** (fuera de alcance): su barcode embebe codificación SAP y son críticas para la cinta de almacén.

### Pendiente
- Validar variantes UPC-only / EAN-only contra ground-truth (faltan los ficheros de par de 4603332 y 4603335).
- Texto exacto de `importado por` (a confirmar con Silvia).

## [2026-06-08] Estructura inicial

### Añadido
- "Cerebro compartido": `docs/` (info cruda), `diseño/` (negocio + arquitectura + backlog), `apps/` (código).
- Comando `/nuevo-requerimiento` para el ritual de diseño de requerimientos.
- Repositorio git + remoto en `PabloS-coolway/automatizaciones`.
