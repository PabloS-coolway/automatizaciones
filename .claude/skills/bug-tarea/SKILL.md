---
name: bug-tarea
description: Convierte un fallo que Pablo describe directamente (no de un correo) en un BUG registrado según la disciplina del proyecto y, tras su OK explícito, en una tarea de ClickUp. Úsalo cuando Pablo diga "bug-tarea", "registra este bug: …", "esto no funciona: …" o describa un fallo que ha visto (no llegado por correo). Captura síntoma + causa raíz sospechada + cómo reproducir, ENSEÑA lo que crearía y ESPERA el OK antes de tocar ClickUp. Registra, no arregla. Familia de 4: si el bug viene de un CORREO usa `bug-correo-tarea`; si es un REQUERIMIENTO usa `requerimiento-tarea` (o `requerimiento-correo-tarea`).
---

# bug-tarea · De un fallo que cuentas directamente, a un BUG bien registrado

El **gemelo de [`bug-correo-tarea`](../bug-correo-tarea/SKILL.md) sin el paso de leer Gmail**: el fallo no
viene de un correo, te lo **describe Pablo directamente** (lo ha visto trabajando, o se lo han contado).
Todo lo demás es idéntico. **Registra, no arregla:** el arreglo + test de regresión es una sesión aparte.

## La regla que manda sobre todas

**Nunca se crea nada en ClickUp sin un OK explícito de Pablo en esta conversación.** Hay un **freno duro**
entre capturar y crear. Ante la duda de si Pablo ha dicho que sí, **no se crea**.

## La disciplina de BUG que NO se negocia (de `CLAUDE.md` y el backlog)

Registrar un BUG **obliga** a capturar tres cosas — si falta una, el registro está incompleto:

1. **Síntoma:** qué falla, en lenguaje de quien lo sufre.
2. **Causa raíz (sospechada):** la hipótesis. Si no se sabe, "por investigar" — no se inventa.
3. **Cómo reproducir:** los pasos / el dato que lo dispara.

Y la pregunta de la familia *"no falla, miente"*: **"si esto devolviera un resultado incompleto, ¿cómo me
enteraría?"**. Si el bug es de esa familia (resultado falso con apariencia de correcto), **dilo**.

## Cómo se usa (lo único que cambia respecto a la de correo)

1. **La entrada es lo que Pablo describe**, no un asunto de correo. **No se lee Gmail.** Si la descripción
   no basta para capturar el síntoma o reproducirlo, **pregunta antes** — no rellenes huecos a ojo.
2. **Resume en 2-3 líneas el fallo** y confírmalo antes de capturar.
3. A partir de ahí, **sigue [`bug-correo-tarea`](../bug-correo-tarea/SKILL.md) tal cual**:
   - **Capturar** síntoma / causa raíz sospechada / cómo reproducir + la respuesta a "¿cómo me enteraría?".
   - Calcular el siguiente **`BUG-XXX`** en `diseño/03-backlog-requerimientos.md` y **añadir la línea**
     (un BUG no lleva carpeta de diseño: va como línea en el backlog + CHANGELOG).
   - Si al describirlo resulta que **no** es un fallo de algo que ya funcionaba, sino valor nuevo,
     **para y propón [`requerimiento-tarea`](../requerimiento-tarea/SKILL.md)**.
   - 🛑 **FRENO**: enseñar la captura + lo que se crearía en ClickUp, y **esperar el OK**.
   - **Crear en ClickUp** (lista Automatizaciones `901219597730`, estado `pendiente`): **tarea**
     `BUG-XXX · <síntoma corto>` (tag `bug` + `bug-xxx` si existe; dedup por título + tag — el tag debe
     existir antes) + las **subtareas de la regla de oro**: (1) reproducir con test en ROJO → (2) arreglar
     → (3) verificar rompiendo el código a propósito. Comprobar duplicados antes de crear.

## Lo único distinto en el contenido

En la descripción de la tarea, la línea de origen es **`Origen: petición directa de Pablo — <fecha>`** (no
«correo …»). El resto es igual.

## Al terminar

Resume: el fallo, el `BUG-XXX` registrado, qué se creó en ClickUp con sus enlaces, y qué queda (arreglarlo
con su test en una sesión de código). Si algo no respondió como se esperaba, **dilo** — aquí se *verifica de
verdad, no se asume*.
