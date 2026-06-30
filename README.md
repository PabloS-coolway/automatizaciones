# Yorga · Automatizaciones

Plataforma de automatizaciones del **Grupo Yorga**. Monorepo que reúne, en un mismo sitio,
el **diseño** (negocio + arquitectura) y el **código** de cada automatización.

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

Contexto del negocio y la arquitectura objetivo: ver [`diseño/`](diseño/) (contexto, mapa tecnológico, arquitectura, backlog).

## Desarrollo (monorepo)

Requisitos: Node 20+, npm 10+, `pdftotext` (poppler-utils) para leer los PDFs de SAP, y **Docker** (Postgres del maestro).

**Puesta en marcha (todo desde la raíz):**
```bash
npm run setup        # install + levanta Postgres + genera cliente Prisma + migra
npm run dev          # turbo: API (:3000) + front (:5173)
```

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
```

## REQ-001 · Etiquetas Coolway (primera automatización)

Genera el **fichero de etiquetas** de un pedido de compra SAP a partir del PDF + el Excel maestro
`REFERENCIAS COOLWAY` (la fuente de verdad de los códigos: se leen, nunca se inventan).

- **API** (`etiquetas-coolway-api`): `POST /api/labels/generate` (batch), `GET /api/markets`, `GET /api/health`. También CLI (`npm start -w @yorga/etiquetas-coolway-api -- generate ...`).
- **Web** (`etiquetas-coolway-web`): subir PDFs + maestro, elegir destino (Valencia / USA / Australia / Italia…), descargar los Excel.
- **Maestro en Postgres** (Fase 2): el maestro de códigos vive en BD (fuente de verdad gobernada). Importador `maestro:import` que une los exports EAN/UPC de prepedidos + calcula SKU. Ver [README de la API](apps/etiquetas-coolway-api/README.md#base-de-datos--maestro-req-001-fase-2).
- Diseño completo: [`diseño/iniciativas/REQ-001-coleccion-coolway/`](diseño/iniciativas/REQ-001-coleccion-coolway/).

**Estado:** Fase 1 (etiquetas) validada con pedidos reales. Fase 2 Bloques 1-2 (maestro en Postgres) funcionando. Pendiente: Bloque 3 (gobernanza/publicar a departamentos), demo a Silvia, y fases 3-4 (tarifas/surtidos, plantillas). Ver [CHANGELOG](CHANGELOG.md).
