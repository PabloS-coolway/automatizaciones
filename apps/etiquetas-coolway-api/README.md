# etiquetas-coolway · REQ-001 Fase 1

Motor de generación del **fichero de etiquetas** de Coolway a partir del PDF de pedido de compra SAP + el maestro `REFERENCIAS COOLWAY`. Arquitectura **hexagonal** sobre **NestJS** (TypeScript).

> Diseño y reglas: [`../../diseño/iniciativas/REQ-001-coleccion-coolway/`](../../diseño/iniciativas/REQ-001-coleccion-coolway/) (PRD, requerimientos, flujo).

## Principio

El maestro es la **única autoridad** de códigos de barra: el motor **busca y lee, nunca inventa**. Si falta un dato, **avisa**.

## Estructura (hexagonal)

```
src/
  domain/         # reglas puras de etiquetas (code128, surtidos, género, label-builder, cuadre)
  application/    # ports + generate-labels.use-case
  infrastructure/ # adapters: pdf/ (parser SAP) · excel/ (lector maestro, serializador)
  interface/      # cli/ (nest-commander) · http/ (API REST)
  maestro/        # MÓDULO Fase 2 (BD maestra): domain/codes · application · infrastructure (Prisma) · interface (CLI)
  auth/           # MÓDULO de acceso: login JWT + roles (operador/admin) + admin de usuarios
prisma/           # schema.prisma + migraciones (Postgres)
test/             # tests del dominio y e2e contra ficheros reales
```

## Configuración

Copia la plantilla y ajusta los valores (el `.env` real **no se versiona**):

```bash
cp .env.example .env
```

| Variable | Para qué | Por defecto |
|---|---|---|
| `DATABASE_URL` | Postgres del maestro | — (obligatoria) |
| `JWT_SECRET` | Firma de los tokens de sesión | secreto de **desarrollo** (⚠ definir al desplegar) |
| `JWT_EXPIRES_IN` | Caducidad del token | `12h` |
| `PORT` | Puerto de la API | `3000` |

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

## Base de datos · Maestro (REQ-001 Fase 2)

El maestro de códigos pasa a vivir en **Postgres** (fuente de verdad gobernada: solo la app escribe). Stack: **Prisma**.

```bash
# 1) Levanta Postgres (desde la raíz del monorepo). Docker, puerto host 5544.
docker compose up -d

# 2) Aplica las migraciones (crea la tabla `reference` + CHECKs de formato)
npm run prisma:migrate            # o: npx prisma migrate deploy

# 3) Importa los exports de prepedidos al maestro (une EAN+UPC por ref+talla, calcula SKU)
npm start -- maestro:import \
  --ean "../../docs/requerimientos/validaciones/EAN.xlsm" \
  --upc "../../docs/requerimientos/validaciones/UPC.xlsm"
```

- Conexión vía `.env` → `DATABASE_URL` (no versionado; ver `docker-compose.yml` para credenciales de dev).
- El importador es **idempotente** (upsert por `(ref, talla)`) y devuelve un **informe** (códigos faltantes, formatos inválidos, desajustes). Valida formatos (EAN13 = 13 díg., UPC = 12) en app y a nivel de BD (CHECK).

## Acceso · Usuarios y roles

Los usuarios viven en la misma Postgres (tabla `app_user`, contraseña con **bcrypt**). La sesión es un **JWT** (`Authorization: Bearer …`).

**Roles:**

| Rol | Puede |
|---|---|
| `operador` | Generar etiquetas y consultar el maestro |
| `admin` | Todo lo anterior **+ importar al maestro** y **gestionar usuarios** |

Toda ruta exige token **salvo** `POST /api/auth/login` y `GET /api/health`. `POST /api/maestro/import` y `/api/users/*` exigen rol `admin`.

**Endpoints:** `POST /api/auth/login` · `GET /api/auth/me` · `GET|POST /api/users` · `PATCH /api/users/:id` (rol, activo, reset de contraseña).

**Primer usuario** (no hay registro abierto; se crea por CLI):

```bash
# desde la raíz del monorepo
npm run auth:create-user -- --email admin@coolway.co --password "…" --name "Admin" --role admin
```

A partir de ahí, un admin da altas/bajas desde la web (sección **Usuarios**). Salvaguardas: un admin no puede desactivarse ni quitarse a sí mismo el rol.

> **Al desplegar:** define `JWT_SECRET` en el entorno (hoy hay uno de desarrollo por defecto), sirve por **HTTPS** y valora mover el token a cookie `httpOnly` (hoy va en `localStorage`).

## Estado

- ✅ **Fase 1** (etiquetas): dominio + adapters (PDF/Excel) + CLI + API HTTP. Validado end-to-end con pedidos reales.
- ✅ **Fase 2 · Bloques 1-2** (maestro en Postgres): importador EAN/UPC + SKU + validación. 672 SKU reales importados, idempotente.
- ✅ **Acceso**: login JWT + roles operador/admin + administración de usuarios desde la web.
- ⏳ **Fase 2 · Bloque 3** (gobernanza): publicar Excel/Sheets desde la BD para departamentos; que etiquetas lea el maestro de la BD; accesos Drive/API.
- ✅ Hitos 1-6: scaffold + dominio + adapters (PDF/Excel) + NestJS/CLI + writer.
- ✅ **Validado end-to-end contra ficheros reales:** reproduce exacto `etiquetas_4603418` (7 filas, 60 pares, cuadre OK). 24 tests en verde.
- ⏳ Pendiente **DEP-06** (Silvia): el writer usa un layout provisional (formato simplificado + Resumen); el formato final solo afecta a `excel-label-writer.adapter.ts`.
- ⏳ Pendiente endurecer el parser de PDF con más muestras (DEP-A6) y, opcionalmente, migrar el extractor de `pdftotext` a pdfjs puro.
