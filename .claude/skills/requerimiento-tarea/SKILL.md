---
name: requerimiento-tarea
description: Convierte un REQUERIMIENTO que Pablo describe directamente (no de un correo) en un requerimiento analizado y, tras su OK explícito, en tareas de ClickUp. Úsalo cuando Pablo diga "requerimiento-tarea", "esto es un requerimiento nuevo: …", "quiero una tarea de este requerimiento" o describa una necesidad de negocio sin que venga de un correo. Corre el ritual de /nuevo-requerimiento, ENSEÑA lo que crearía y ESPERA el OK antes de tocar ClickUp. Familia de 4: si el requerimiento viene de un CORREO usa `requerimiento-correo-tarea`; si es un BUG usa `bug-tarea` (o `bug-correo-tarea`).
---

# requerimiento-tarea · De una petición directa al board, con el análisis de siempre

El **gemelo de [`requerimiento-correo-tarea`](../requerimiento-correo-tarea/SKILL.md) sin el paso de leer
Gmail**: el requerimiento no viene de un correo, te lo **describe Pablo directamente** (en el chat, o te lo
cuenta de otro canal). Todo lo demás es idéntico.

## La regla que manda sobre todas

**Nunca se crea nada en ClickUp sin un OK explícito de Pablo en esta conversación.** Hay un **freno duro**
entre el análisis y la creación. Ante la duda de si Pablo ha dicho que sí, **no se crea**.

## Cómo se usa (lo único que cambia respecto a la de correo)

1. **La entrada es lo que Pablo describe**, no un asunto de correo. **No se lee Gmail.** Si la descripción
   es ambigua o le falta el dato/dueño crítico, **pregunta antes de analizar** — no lo inventes.
2. **Resume en 2-3 líneas lo que has entendido** y confírmalo antes de diseñar.
3. A partir de ahí, **sigue [`requerimiento-correo-tarea`](../requerimiento-correo-tarea/SKILL.md) tal
   cual**, desde su paso 2:
   - **Clasificar** (REQ / MEJ / BUG). Si resulta ser un BUG, **para y propón [`bug-tarea`](../bug-tarea/SKILL.md)**.
   - **Analizar** (sólo REQ): ritual de `/nuevo-requerimiento` → siguiente `REQ-XXX` en el backlog +
     `diseño/iniciativas/REQ-XXX-<slug>/diseño.md` con próximos pasos.
   - 🛑 **FRENO**: enseñar el análisis + lo que se crearía en ClickUp, y **esperar el OK**.
   - **Crear en ClickUp** (lista Automatizaciones `901219597730`, estado `pendiente`): **tarea madre**
     `REQ-XXX · <título>` (tag `req-xxx`, dedup por título + tag — el tag debe existir antes) + **una
     subtarea por próximo paso**. Comprobar duplicados antes de crear.

## Lo único distinto en el contenido

En la descripción de la tarea madre, la línea de origen es **`Origen: petición directa de Pablo — <fecha>`**
(no «correo …»). El resto —análisis, freno, dedup, subtareas, registro en el backlog— es igual.

## Al terminar

Resume: qué se entendió, cómo se clasificó, qué `REQ-XXX` se registró, qué se creó en ClickUp con sus
enlaces, y qué queda (p. ej. committear el diseño con `pr-coolway`). Si algo no respondió como se esperaba,
**dilo** — aquí se *verifica de verdad, no se asume*.
