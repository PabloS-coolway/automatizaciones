---
name: correo-a-tareas
description: Convierte un correo de Gmail (dado su asunto) en un requerimiento analizado y, tras el OK explícito de Pablo, en tareas de ClickUp. Úsalo cuando Pablo diga "correo-a-tareas", "pasa este correo a tareas", "analiza el correo <asunto>" o similar. Lee el correo, corre el ritual de /nuevo-requerimiento, ENSEÑA lo que crearía y ESPERA el OK antes de tocar ClickUp. No confundir con /nuevo-requerimiento (que sólo diseña, no lee correo ni crea tareas).
---

# correo-a-tareas · Del correo al board, sin perder el análisis por el camino

Coge un correo (Silvia, Tomás, quien sea), lo entiende como requerimiento **con el ritual de siempre**,
y sólo cuando Pablo da el OK lo vuelca a ClickUp. El análisis no es un paso que se salta para llegar
antes a las tareas: es lo que hace que la tarea del board **signifique algo**.

## La regla que manda sobre todas

**Nunca se crea nada en ClickUp sin un OK explícito de Pablo en esta conversación.** Crear tareas es una
acción hacia fuera, la ve el equipo, y deshacerla es engorroso. El flujo tiene un **freno duro** entre el
análisis y la creación (paso 4). Si hay cualquier duda sobre si Pablo ha dicho que sí, **no se crea**.

## Datos fijos del entorno (verificados, no adivinar)

- **Buzón:** el Gmail personal de Pablo, **`silvap.javier@gmail.com`** (ahí llegan los correos de
  negocio). Si el conector de Gmail responde con otra cuenta, **PARA y dilo** — no analices el correo
  equivocado.
- **ClickUp → dónde caen las tareas:** lista **Automatizaciones** (`list_id 901219597730`), dentro del
  folder *Proyectos*, en el *Espacio del equipo [ES]*. Estados: `pendiente` → `en curso` → `completado`
  (las nuevas nacen en **pendiente**). La lista **no tiene campos personalizados**: el origen y el REQ se
  marcan con **tag** + una línea en la descripción (ver paso 5).

## Pasos

### 1. Leer el correo (no inventarlo)

Pablo da el **asunto**. Busca el hilo en Gmail por ese asunto y **lee el contenido real**.

- Si **no hay ninguna coincidencia**: dilo y para. No se diseña sobre un correo que no se ha leído.
- Si hay **varias**: enséñale los candidatos (remitente + fecha + primeras líneas) y que elija. No asumas
  que el más reciente es el bueno.
- Cuando tengas el hilo, **resume en 2-3 líneas lo que pide** y confírmalo antes de analizar. Un correo
  mal entendido produce un requerimiento mal entendido.

### 2. Clasificar antes de diseñar (REQ / MEJ / BUG)

No todo lo que entra es un requerimiento. Aplica la tabla de
[`diseño/03-backlog-requerimientos.md`](../../../diseño/03-backlog-requerimientos.md):

| Tipo | Qué es | Qué hace esta skill |
|---|---|---|
| **REQ** | Valor de negocio nuevo | **Ritual completo** (paso 3) → tarea madre + subtareas |
| **MEJ** | Mejora sobre algo que ya existe (UX, rendimiento, DX) | Sin ritual: una tarea con el qué y el porqué |
| **BUG** | Algo que ya debía funcionar y no funciona | Sin ritual, pero la tarea exige **síntoma + causa raíz sospechada + cómo se reproduce** |

Si dudas entre REQ y MEJ/BUG, **pregunta a Pablo** — no lo decidas por él.

### 3. Analizar (sólo para REQ) — reutiliza el ritual

Corre el ritual de **[`/nuevo-requerimiento`](../../commands/nuevo-requerimiento.md)** sobre el contenido
del correo, sin saltarte pasos:

- Carga contexto (`docs/`, `diseño/00`..`02`).
- Calcula el siguiente **`REQ-XXX`** mirando el backlog y **añade la fila** (`🔍 En análisis`).
- Escribe **`diseño/iniciativas/REQ-XXX-<slug>/diseño.md`** con problema de negocio, sistemas afectados
  (entradas/salidas/dueño del dato), encaje arquitectónico, opciones y recomendación, preguntas/riesgos y
  **próximos pasos** (esos pasos son la fuente de las subtareas del paso 5).

Estos ficheros son artefactos **del repo**: quedan en el working tree. Committearlos es aparte (con
`pr-coolway` cuando toque) — esta skill no hace git.

### 4. 🛑 FRENO — enseñar y esperar el OK

Antes de tocar ClickUp, muéstrale a Pablo, en el chat:

1. **El análisis** (resumen de negocio + recomendación).
2. **Exactamente lo que se crearía** en ClickUp:
   - **Tarea madre**: título (`REQ-XXX · <título>`), lista destino, tag, y el cuerpo.
   - **Subtareas**: la lista de próximos pasos, una por línea.
3. Si ya hay tareas de ese REQ en el board (ver dedup, paso 5), **dilo aquí** — no lo descubras después.

Y **para**. No se sigue al paso 5 hasta un "ok / dale / créalas" claro de Pablo. Si pide cambios, se
ajustan y se vuelve a enseñar.

### 5. Crear en ClickUp (sólo tras el OK)

**Antes de crear, comprobar duplicados.** Busca en la lista tareas con el tag `req-XXX` (o por el título
`REQ-XXX`). Si ya existe la madre: **no la dupliques** — informa y, como mucho, añade las subtareas que
falten. Correr la skill dos veces sobre el mismo correo no debe llenar el board de repetidos.

> ⚠ **Los tags de ClickUp tienen que existir antes en el Space** — `add_tag_to_task` (y crear tarea con
> `tags`) **falla si el tag no existe**, y desde aquí no se puede crear un tag. Por eso el dedup se apoya en
> **DOS** marcas: el `req-xxx` del **título** (siempre fiable, no depende de nada) y el **tag** (mejor para
> filtrar, pero sólo si ya existe). Flujo: intenta poner el tag; si falla porque no existe, **sigue igual**
> (el título ya identifica la tarea) y **pídele a Pablo que cree el tag** en ClickUp para dejarlo redondo.

**Tarea madre** en la lista Automatizaciones (`901219597730`), estado `pendiente`:
- **Título:** `REQ-XXX · <título corto>` (para MEJ/BUG, `MEJ:` / `BUG:` + título).
- **Tag:** `req-xxx` (o `mej` / `bug`) — es la marca para el dedup.
- **Descripción:** resumen de negocio + valor + **enlace al diseño** (`diseño/iniciativas/REQ-XXX/`) y, al
  final, una línea **`Origen: correo «<asunto>» — <fecha>`** para saber de dónde salió.

**Subtareas** (una por próximo paso), con `parent` = id de la madre, también en `pendiente`.

Al terminar, dale a Pablo **los enlaces** (URL de la madre y cuántas subtareas se crearon). Si algo falló
a medias, **dilo** — no lo escondas: es peor una creación a medias silenciosa que un error claro.

## Al terminar

Resume: qué correo se leyó, cómo se clasificó, qué REQ se registró (si aplica), qué se creó en ClickUp con
sus enlaces, y qué queda pendiente (p. ej. committear el diseño con `pr-coolway`, o una decisión abierta
del análisis). Si el buzón, el asunto o el board no respondieron como se esperaba, **dilo** — este proyecto
se rige por *verificar de verdad, no asumir*.
