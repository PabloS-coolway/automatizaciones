# Changelog

Registro de avances del proyecto de automatizaciones de Yorga.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/).

## [2026-06-30] REQ-001 Fase 2 — Maestro en Postgres (Bloques 1 y 2)

### Añadido
- **Postgres** vía Docker (`docker-compose.yml`, host 5544) como **fuente de verdad del maestro**.
- **Prisma**: modelo `Reference` (una fila por `(ref,size)`), unique `ean13`, **CHECK** de formato EAN13/UPC. Migraciones versionadas.
- **Módulo `maestro`** (hexagonal en la api): importador que une **EAN.xlsm + UPC.xlsm** por `(ref,talla)`, calcula **SKU** y hace **upsert** con **informe** (faltantes, formatos inválidos, desajustes) — Bloques 1 y 2.
- CLI **`maestro:import --ean … --upc …`**.

### Validación
- Importados **672 SKU** reales (EAN+UPC completos, 0 incidencias); **re-import idempotente** (0 duplicados). 36 tests verde.

### Decidido
- Stack: **Prisma + Postgres**; el módulo vive dentro de `etiquetas-coolway-api` (se separará si crece).
- El maestro pasa a ser BD (gobernanza nativa: solo la app escribe). Pendiente: publicar Excel/Sheets desde la BD para los departamentos y que etiquetas lea de la BD.

## [2026-06-30] Validación con 3 pedidos reales de Silvia + parser robusto

### Corregido (parser de PDF SAP, gracias a la validación)
- **Pedidos largos:** los nº de línea de 2+ dígitos saltan a otra línea y el ítem empieza por el style → la cabecera se detecta ahora por **color (2-4 may) + cajas**, sin depender del nº de línea (antes se cortaba en el ítem 9).
- **Surtido** se toma del **sufijo de la ref SAP** (`…I`/`…S36`), no de la columna ASS (que viene `00I` en cajas).
- **Falsos positivos:** el nº de pedido (7 díg.) ya no se confunde con una ref SAP (ahora ≥11 díg. + línea con "total"); filas de fecha/moneda ya no se toman como cabecera (style debe ser alfanumérico).

### Añadido / cambiado
- **Catálogo de surtidos** completado con curvas reales de los bultos: E, L, M, N (chica) y R, S, T, Y (chico).
- `importado por` con nombres legales: **VANYOR S.A.U** y **COOLWAY USA LLC**.
- Test de regresión e2e de cajas surtidas (4603187 → 8444 pares de pedido).

### Validación (3 pedidos reales)
- **4603552** (112 pares sueltos UPC+EAN), **4603187** (8444 cajas CODE128+EAN), **4603338** (1840 solo EAN): el total de PEDIDO calculado **cuadra exacto** con lo declarado. La pequeña diferencia en la salida son **códigos faltantes en nuestra copia del maestro** (modelo EDGE, etc.), que el sistema **avisa** — pendiente maestro actualizado del Drive.

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
