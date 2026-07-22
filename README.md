# Yorga · Automatizaciones

Plataforma de automatizaciones del **Grupo Yorga**. Monorepo que reúne, en un mismo sitio,
el **diseño** (negocio + arquitectura) y el **código** de cada automatización.

> **¿Retomas el trabajo o vienes de otro ordenador?** Empieza por **[`ESTADO.md`](ESTADO.md)**: dónde
> vamos, qué probar y cuál es el siguiente hilo. El contexto para Claude Code está en [`CLAUDE.md`](CLAUDE.md).

Filosofía: **pensamos negocio + arquitectura antes de implementar.** Nada se construye sin
saber qué dato consume, qué dato produce y quién es su dueño (sistema fuente de la verdad).

## Estructura del repo

```
automatizaciones/            (monorepo: npm workspaces + Turborepo)
├── docs/                     info cruda recibida (correos, ficheros, PDFs)        ← input
├── diseño/                   negocio, arquitectura objetivo, requerimientos        ← el "porqué"
│   └── iniciativas/          una carpeta por requerimiento (REQ-XXX)
├── apps/                     código de las automatizaciones                        ← el "cómo"
│   ├── etiquetas-coolway-api/   NestJS (hexagonal): dominio + CLI + API HTTP
│   └── etiquetas-coolway-web/   React + Vite: front de la herramienta
├── packages/
│   └── contracts/            @yorga/contracts — tipos/DTOs compartidos API↔web
├── .claude/                  comando /nuevo-requerimiento (ritual de diseño)
└── CHANGELOG.md
```

## Cómo trabajamos (flujo de un requerimiento)

0. La info que nos envían se guarda en [`docs/`](docs/).
1. Se lanza **`/nuevo-requerimiento <descripción>`** → registra en [`diseño/03-backlog-requerimientos.md`](diseño/03-backlog-requerimientos.md).
2. Pensamos **negocio + arquitectura** (¿qué resuelve? ¿qué sistemas toca? ¿cómo encaja?).
3. **Diseñamos** la iniciativa en `diseño/iniciativas/REQ-XXX/` (diseño, requerimientos, PRD, flujo).
4. **Implementamos** en `apps/` solo cuando el diseño está validado.

**Del correo (o una descripción) a ClickUp.** Una familia de skills de Claude Code convierte lo que entra en
tareas del board, con freno antes de crear nada: `requerimiento-correo-tarea` / `bug-correo-tarea` (leen un
correo de Gmail dado su asunto) y `requerimiento-tarea` / `bug-tarea` (parten de lo que describes). Analizan
con el ritual de siempre, enseñan lo que crearían y **esperan tu OK**. Cerrar un bloque en PR: `pr-coolway`.

Contexto del negocio y la arquitectura objetivo: ver [`diseño/`](diseño/) (contexto, mapa tecnológico, arquitectura, backlog).

## Desarrollo (monorepo)

Requisitos: Node 20+, npm 10+, `pdftotext` (poppler-utils) para leer los PDFs de SAP, y **Docker** (Postgres del maestro).

**Puesta en marcha (todo desde la raíz):**
```bash
cp apps/etiquetas-coolway-api/.env.example apps/etiquetas-coolway-api/.env   # config (BD + JWT)
npm run setup        # install + levanta Postgres + genera cliente Prisma + migra

# skills de Claude Code: el contenido no se versiona, se restaura del skills-lock.json
npx skills experimental_install

# crea el primer usuario (no hay registro abierto: la app pide login)
npm run auth:create-user -- --email admin@coolway.co --password "…" --name "Admin" --role admin

npm run dev          # turbo: API (:3000) + front (:5173)
```

> **Skills y comandos de Claude Code.** El comando `/nuevo-requerimiento` (`.claude/commands/`) **sí** está
> versionado. El **contenido** de los skills no (`.claude/skills/`, `.agents/` están en `.gitignore`): viaja
> sólo el `skills-lock.json`, y se restauran con `npx skills experimental_install`. Sin ese paso, en un clon
> nuevo no tendrás los skills instalados.

**Comandos (raíz):**
```bash
npm test             # turbo: tests de todos los paquetes
npm run build        # turbo: build de todos
npm run typecheck    # turbo: typecheck de todos

npm run db:up        # levanta Postgres (Docker, host 5544) y espera a que esté listo
npm run db:down      # para Postgres
npm run db:migrate   # aplica migraciones (prisma migrate deploy)
npm run db:studio    # explora el maestro en el navegador (Prisma Studio :5555)
npm run maestro:import:demo   # importa los EAN/UPC de ejemplo al maestro

npm run auth:create-user -- --email … --password … --name … --role admin|operador
```

**Configuración:** la API lee `apps/etiquetas-coolway-api/.env` (no versionado). Plantilla con todas las
variables y su explicación en [`.env.example`](apps/etiquetas-coolway-api/.env.example).

## Acceso (login, roles y permisos · REQ-006)

La herramienta pide **login**. Los usuarios viven en la misma Postgres (contraseña con bcrypt) y la sesión es un JWT.

**Los permisos son dato, no código.** Un rol tiene un conjunto de **features** (permisos por sección), y
tanto los roles como sus features **se gobiernan desde el panel** (sección *Roles*, sólo con la feature
`roles.gestionar`) — sin tocar el repo ni desplegar. `operador` y `admin` vienen sembrados como roles de
sistema; se pueden crear más (p. ej. `contable`).

| Feature | Da acceso a |
|---|---|
| `etiquetas.ver` | Generar etiquetas |
| `maestro.ver` | Consultar la base de datos (maestro) |
| `maestro.cargar` | Cargar / importar el maestro |
| `destinos.gestionar` | Gestionar destinos |
| `usuarios.gestionar` | Gestionar usuarios |
| `roles.gestionar` | Gestionar roles y permisos |

El **catálogo de features es cerrado** (vive en `@yorga/contracts`): se asignan a roles con checkboxes, pero
no se inventan desde la web. Dos reglas que la API no deja saltarse: el permiso se **comprueba en el
servidor** (el guard lee las features del rol de la BD en cada petición → un cambio aplica sin re-login), y
**no puedes tapiarte fuera** (siempre debe quedar un rol activo con `roles.gestionar`).

Roles/features sembrados: `admin` = todas · `operador` = `etiquetas.ver` + `maestro.ver`. El primer admin se
crea por CLI (`npm run auth:create-user --role admin`); a partir de ahí, usuarios y roles se gestionan desde la web.

> **Al desplegar:** define `JWT_SECRET` en el entorno (en local hay un secreto de desarrollo por defecto) y sirve por HTTPS.

## REQ-001 · Etiquetas Coolway (primera automatización)

Genera el **fichero de etiquetas** de un pedido de compra SAP a partir del PDF + el Excel maestro
`REFERENCIAS COOLWAY` (la fuente de verdad de los códigos: se leen, nunca se inventan).

- **API** (`etiquetas-coolway-api`): `POST /api/labels/generate` (batch), `GET /api/markets`, `GET /api/health`. También CLI (`npm start -w @yorga/etiquetas-coolway-api -- generate ...`).
- **Web** (`etiquetas-coolway-web`): subir PDFs + maestro, elegir destino (Valencia / USA / Australia / Italia…), descargar los Excel.
- **Maestro en Postgres** (Fase 2): el maestro de códigos vive en BD (fuente de verdad gobernada). Importador `maestro:import` que une los exports EAN/UPC de prepedidos + calcula SKU. Ver [README de la API](apps/etiquetas-coolway-api/README.md#base-de-datos--maestro-req-001-fase-2).
- Diseño completo: [`diseño/iniciativas/REQ-001-coleccion-coolway/`](diseño/iniciativas/REQ-001-coleccion-coolway/).

**Estado:** desplegado y validado con pedidos reales (calzado, ropa, calcetines y bolsas). Ver
[CHANGELOG](CHANGELOG.md) y [ESTADO.md](ESTADO.md) para el detalle y el siguiente hilo.

Entregado hasta hoy, además de REQ-001:
- **REQ-002 · Tablas explorables** — filtrar por columna y ordenar (como en Excel) en todas las tablas.
- **REQ-003 · Ropa, calcetines y bolsas** — el SKU tiene tres tallas (PDF ≠ código de barras ≠ impresa).
- **REQ-004 · Destinos gestionables** — los destinos y sus códigos se administran desde la web, no en código.
- **REQ-006 · Roles y permisos por feature** — quién puede qué es dato autoadministrable (ver *Acceso* arriba).

En curso: **REQ-005** (podar los ficheros de SAP —materiales/tarifas/surtidos— a lo realmente comprado).
Y una familia de bugs propia del proyecto que **no falla, miente**: siempre nos preguntamos *"si esto
devolviera un resultado incompleto, ¿cómo me enteraría?"* — cada arreglo trae su test de regresión.
