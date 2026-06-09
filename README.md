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

Requisitos: Node 20+, npm 10+, y `pdftotext` (poppler-utils) para leer los PDFs de SAP.

```bash
npm install          # instala todos los workspaces
npm run dev          # turbo: API (:3000) + front (:5173)
npm test             # turbo: tests de todos los paquetes
npm run build        # turbo: build de todos
npm run typecheck    # turbo: typecheck de todos
```

## REQ-001 · Etiquetas Coolway (primera automatización)

Genera el **fichero de etiquetas** de un pedido de compra SAP a partir del PDF + el Excel maestro
`REFERENCIAS COOLWAY` (la fuente de verdad de los códigos: se leen, nunca se inventan).

- **API** (`etiquetas-coolway-api`): `POST /api/labels/generate` (batch), `GET /api/markets`, `GET /api/health`. También CLI (`npm start -w @yorga/etiquetas-coolway-api -- generate ...`).
- **Web** (`etiquetas-coolway-web`): subir PDFs + maestro, elegir destino (Valencia / USA / Australia / Italia…), descargar los Excel.
- Diseño completo: [`diseño/iniciativas/REQ-001-coleccion-coolway/`](diseño/iniciativas/REQ-001-coleccion-coolway/).

**Estado:** API y motor validados contra ficheros reales (cuadre OK, reproduce la salida que validó negocio). Front funcional. Pendiente: validar variantes restantes con negocio y demo; luego fases 2-4 (BD maestra, ficheros SAP, plantillas de ventas). Ver [CHANGELOG](CHANGELOG.md).
