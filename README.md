# Yorga · Automatizaciones — Cerebro compartido

Repositorio de contexto y diseño para la estrategia de automatización del Grupo Yorga.
No es (todavía) código: es el lugar donde **pensamos negocio + arquitectura antes de implementar**.

## Cómo trabajamos

0. **Toda la info que nos envían** se guarda en [`docs/`](docs/) (es la fuente cruda).
1. **Llega un requerimiento** (de cualquier área: stock, catálogo, BI, marketing, operaciones…).
   → Se lanza con el comando **`/nuevo-requerimiento <descripción>`**, que revisa `docs/` + el contexto y lo registra en [`diseño/03-backlog-requerimientos.md`](diseño/03-backlog-requerimientos.md).
2. **Pensamos negocio + arquitectura.** Antes de tocar una línea de código respondemos:
   ¿qué problema de negocio resuelve? ¿qué sistemas toca? ¿cómo encaja en la arquitectura objetivo?
3. **Diseñamos.** Cada iniciativa madura se documenta como una propuesta (carpeta en `diseño/iniciativas/`).
4. **Implementamos.** Solo cuando el diseño está validado bajamos a build.

> Regla de oro: ninguna automatización se construye sin que sepamos qué dato consume,
> qué dato produce, y quién es su dueño (sistema fuente de la verdad).

## Índice del contexto

Todo el contexto vive en [`diseño/`](diseño/):

| Documento | Para qué sirve |
|---|---|
| [`diseño/00-contexto-negocio.md`](diseño/00-contexto-negocio.md) | Quién es Yorga, marcas, sociedades, modelo de negocio |
| [`diseño/01-mapa-tecnologico.md`](diseño/01-mapa-tecnologico.md) | Inventario de sistemas actuales (se rellena conforme mapeamos) |
| [`diseño/02-arquitectura-objetivo.md`](diseño/02-arquitectura-objetivo.md) | Hacia dónde queremos ir (visión técnica) |
| [`diseño/03-backlog-requerimientos.md`](diseño/03-backlog-requerimientos.md) | Cola de requerimientos entrantes |
| `diseño/iniciativas/` | Una carpeta por iniciativa diseñada en detalle |

## Estado

- **En curso:** REQ-001 Coolway — Fase 1 (fichero de etiquetas). **Monorepo** (npm workspaces + Turbo): API en [`apps/etiquetas-coolway-api/`](apps/etiquetas-coolway-api/) (funcionando, validada contra ficheros reales), front en `apps/etiquetas-coolway-web/` (en construcción), tipos compartidos en [`packages/contracts/`](packages/contracts/). Ver [CHANGELOG](CHANGELOG.md).
- **Próximo hito:** validar variantes restantes con Silvia y demo; luego fases 2-4 (BD maestra, ficheros SAP, plantillas).
- Pendiente transversal: completar `diseño/01-mapa-tecnologico.md` (mapeo de infraestructura).
