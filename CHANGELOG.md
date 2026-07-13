# Changelog

Registro de avances del proyecto de automatizaciones de Yorga.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/).

## [2026-07-13] Maestro y lectura del PDF — un bug que imprimía etiquetas de menos

Al cargar el maestro nuevo (`REFERENCIAS COOLWAY_13_07_2026_2.xlsx`) y probar el pedido 4603662
salieron a la luz tres problemas, uno de ellos **grave y silencioso**.

### Corregido
- **🚨 El parser se comía líneas enteras del pedido, sin avisar.** Reconocía el código de color con
  `/^[A-Z]{2,4}$/` (sólo letras), así que los colores **compuestos** (`W-B` blanco-negro, `B-W`, `W-R`)
  no encajaban: no detectaba la cabecera del ítem y **descartaba la línea completa**. En el pedido 4603662
  eran **37 refs · 133 cajas · 798 pares** que nunca se habrían etiquetado. Y el cuadre decía "OK".
- **El cuadre era CIRCULAR y no podía detectarlo**: comparaba las etiquetas contra el pedido leído, pero
  ambos lados salen del mismo catálogo de surtidos. Ahora se contrasta también contra el **total que el
  propio PDF declara al pie** (`TOTAL BOXES` / `TOTAL PAIRS`) — la única fuente independiente. Si no
  coincide, la web avisa en rojo: *"El PDF no se ha leído entero: faltan N pares"*. Verificado contra los
  4 pedidos de muestra (60, 1.840, 8.444 y 11.028 pares): todos coinciden con lo declarado.
- **`POST /api/labels/generate` ya no devuelve un 500 genérico** ante un surtido desconocido: responde
  **422** diciendo cuál es (*"El pedido usa el surtido M36, que no está en el catálogo"*).

### Añadido
- **Surtido `M<nn>`** (caja monotalla: 6 pares, todos de la misma talla), junto al `S<nn>` que ya existía.
  Confirmado contra el propio PDF: 1.838 cajas × 6 = 11.028 pares, el total que declara.
- **Migración `ean13_deja_de_ser_unico`**: el EAN13 deja de tener restricción de unicidad. Un producto
  **re-referenciado** en SAP conserva su código en la ref vieja y en la nueva (mismo modelo+color, dos
  refs): era legítimo y la BD lo rechazaba. La identidad del SKU sigue siendo `(ref, talla)`.
  Desbloquea **47 SKU** (maestro: 5.689 → **5.736**).
- **El EAN13 repetido ahora AVISA, no rechaza**: `findSharedEan13` distingue la re-referenciación
  (legítima, entra sin ruido) de dos **productos distintos** compartiendo código de barras (entra, pero se
  reporta en cada carga). Hoy son **33 avisos** — ver ESTADO.

### Cambiado
- **Un código vacío en el Excel ya no borra el que hay en la BD.** El upsert omitía los campos vacíos…
  no: los escribía como `NULL`. Cargar el maestro nuevo habría **borrado 76 UPC** (familia 2003), dejando
  esas tallas sin poder etiquetarse para USA. Ahora vacío significa *"no lo sé"*, no *"bórralo"*.

## [2026-07-12] Entorno — se comprueba `pdftotext` antes de fallar, y el error se entiende

Generar etiquetas moría con un **`⚠ Internal server error`** opaco en una máquina sin `pdftotext`.
La dependencia **ya estaba documentada** (README y ESTADO), así que el problema no era de documentación:
era que **nada la hacía cumplir**. `npm run setup` pasaba en verde con una dependencia crítica ausente y
el fallo aparecía mucho después, en runtime, disfrazado.

### Añadido
- **Preflight de dependencias de sistema** ([`scripts/preflight.mjs`](scripts/preflight.mjs)), enganchado a
  `npm run setup` (y suelto con `npm run preflight`): comprueba `pdftotext` y `docker` —las que `npm install`
  **no** trae— y aborta con el comando exacto de instalación. El fallo se ve al minuto 0, no al minuto 40.
- **Aviso al arrancar la API**: si falta `pdftotext`, lo dice por consola en vez de arrancar mudo y
  reventar en la primera generación.
- **Skill `/pr-coolway`** ([`.claude/skills/pr-coolway/`](.claude/skills/pr-coolway/)) y **plantilla de PR**
  ([`.github/pull_request_template.md`](.github/pull_request_template.md)): cerrar un bloque implica rama,
  puerta de calidad, CHANGELOG + ESTADO, y push por `origin` (github-coolway). Es un skill propio del
  proyecto, así que **sí se versiona** (excepción en `.gitignore` frente a los skills de terceros).

### Corregido
- **`POST /api/labels/generate` ya no devuelve un 500 genérico** cuando falta `pdftotext`: responde
  **503** con el motivo real y cómo resolverlo. El front ya pintaba el campo `message`, así que Silvia lee
  el problema en vez de "Internal server error". Coherente con la regla del proyecto: *si falta un dato, se avisa*.
- El extractor distingue **"no existe el binario"** (`ENOENT`) de **un fallo real del PDF**, que antes se
  confundían en el mismo mensaje.

### Pendiente (despliegue)
- `pdftotext` es dependencia **del sistema operativo**: `npm ci` **no** la instala. Al desplegar hay que
  añadirla a la imagen/VM (`apt-get install -y poppler-utils`). No hay Dockerfile ni docs de despliegue todavía.

## [2026-07-12] Maestro — carga completa desde la web + informe de rechazadas

### Añadido
- **`POST /api/maestro/seed`** (sólo admin) y panel **"Cargar maestro completo"** en la web: se sube
  `REFERENCIAS COOLWAY.xlsx` sin necesidad de CLI ni acceso al servidor. Upsert por (ref, talla): idempotente, no borra.
- `SeedMasterUseCase` compartido por CLI y web (una sola lógica de carga).
- **Informe de filas rechazadas**: antes el upsert toleraba fallos pero sólo los contaba, así que se
  perdían filas en silencio. Ahora dice **qué** fila se quedó fuera y **por qué** (modelo, color, ref, talla, motivo).

### Detectado (calidad del maestro)
- El Excel maestro tiene **29 filas con EAN13 duplicado** → esas tallas no entran en la BD y no se pueden
  etiquetar. Ej.: `8433852550355` está en **GOAL EXP 42** y en **GOAL BRW 42**. Explicaba el descuadre de 1 par
  del pedido 4603338 contra BD. **Pendiente**: que Silvia corrija los duplicados. Ver [`ESTADO.md`](ESTADO.md).

### Documentación
- **`CLAUDE.md`** (contexto y reglas del proyecto) y **`ESTADO.md`** (traspaso: dónde vamos, qué probar, qué sigue).

## [2026-07-01] Acceso — login, roles y administración de usuarios

### Añadido
- **Login** con JWT y usuarios en la **misma Postgres** (tabla `app_user`, contraseñas con **bcrypt**). Módulo `auth` hexagonal en la api.
- **Roles**: `operador` (genera etiquetas, consulta el maestro) y `admin` (además **importa al maestro** y **gestiona usuarios**).
- **Guards globales**: toda ruta exige token salvo `POST /api/auth/login` y `GET /api/health`; `POST /api/maestro/import` y `/api/users/*` exigen `admin`.
- **Pantalla de Usuarios** (sólo admin): alta, cambio de rol, activar/desactivar y reset de contraseña. Salvaguardas: un admin no puede desactivarse ni auto-degradarse.
- CLI **`auth:create-user`** para crear el primer admin (no hay registro abierto).
- **`.env.example`** con todas las variables (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`).

### Añadido (etiquetas)
- El detalle de un fallo indica ahora **cuántos pares afecta** cada código sin resolver y el **motivo** en claro (no está en el maestro / sin EAN13 / sin UPC).

### Decidido
- Identidad **en nuestra BD** (no SSO corporativo, aún por mapear la infra del grupo). Alcance **local/preparación**.
- **Pendiente al desplegar**: definir `JWT_SECRET` en el entorno, HTTPS y valorar cookie `httpOnly` en vez de `localStorage`.

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
