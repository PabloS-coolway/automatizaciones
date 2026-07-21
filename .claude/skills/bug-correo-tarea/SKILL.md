---
name: bug-correo-tarea
description: Convierte un correo que reporta un fallo (dado su asunto) en un BUG registrado según la disciplina del proyecto y, tras el OK explícito de Pablo, en una tarea de ClickUp. Úsalo cuando Pablo diga "bug-correo-tarea", "registra este bug del correo <asunto>", "esto es un bug del correo <asunto>" o similar. Lee el correo, captura síntoma + causa raíz sospechada + cómo reproducir, ENSEÑA lo que crearía y ESPERA el OK antes de tocar ClickUp. Familia de 4: si el origen NO es un correo usa `bug-tarea`; si es un REQUERIMIENTO usa `requerimiento-correo-tarea` (o `requerimiento-tarea`).
---

# bug-correo-tarea · De un correo que reporta un fallo, a un BUG bien registrado

Coge un correo donde alguien (Silvia, el equipo) dice que **algo que debería funcionar no funciona**, lo
captura como BUG **con la disciplina de este proyecto** (síntoma, causa raíz, reproducción) y, sólo con el
OK de Pablo, lo vuelca a ClickUp. **Registra, no arregla:** el arreglo + test de regresión es una sesión de
código aparte.

## La regla que manda sobre todas

**Nunca se crea nada en ClickUp sin un OK explícito de Pablo en esta conversación.** Igual que en
[`requerimiento-correo-tarea`](../requerimiento-correo-tarea/SKILL.md): hay un **freno duro** entre capturar
y crear (paso 4). Ante la duda de si Pablo ha dicho que sí, **no se crea**.

## La disciplina de BUG que NO se negocia (de `CLAUDE.md` y el backlog)

Un BUG es **algo que ya debía funcionar y no funciona**. Registrarlo **obliga** a capturar tres cosas —
si falta alguna, el registro está incompleto:

1. **Síntoma:** qué se observa que falla, en lenguaje de quien lo sufre (lo que dice el correo).
2. **Causa raíz (sospechada):** la hipótesis. Si aún no se sabe, se dice "por investigar" — no se inventa.
3. **Cómo reproducir:** los pasos / el dato con el que se dispara.

Y dos cosas que se dejan escritas para quien lo arregle, porque son la regla de oro del proyecto:
- **El arreglo trae un test de regresión, y antes de darlo por bueno se ROMPE el código a propósito** para
  ver que el test se pone en rojo. Un test que pasa igual con el bug da falsa seguridad.
- **La pregunta de la familia "no falla, miente":** *"si esto devolviera un resultado incompleto, ¿cómo me
  enteraría?"*. Si el bug es de esa familia (devuelve un resultado falso que parece bueno), **dilo** — es lo
  más peligroso que hay aquí.

## Datos fijos del entorno (verificados, no adivinar)

- **Buzón:** el Gmail personal de Pablo, **`silvap.javier@gmail.com`**. Si el conector responde con otra
  cuenta, **PARA y dilo**.
- **ClickUp → dónde cae el bug:** lista **Automatizaciones** (`list_id 901219597730`), estados
  `pendiente` → `en curso` → `completado` (nace en **pendiente**). Sin campos personalizados.

## Pasos

### 1. Leer el correo (no inventarlo)

Pablo da el **asunto**. Busca el hilo en Gmail y **lee el contenido real**.
- Si **no hay coincidencia**: dilo y para.
- Si hay **varias**: enséñale los candidatos (remitente + fecha + primeras líneas) y que elija.
- **Resume en 2-3 líneas el fallo que describe** y confírmalo antes de capturar. Un fallo mal entendido
  produce un bug mal registrado.

### 2. Capturar el BUG (la disciplina de arriba) y registrarlo en el backlog

- Redacta **síntoma / causa raíz sospechada / cómo reproducir**. La causa raíz puede quedar "por
  investigar": es honesto, y mejor que una hipótesis inventada.
- Hazte la pregunta "no falla, miente" y **anota la respuesta** en la captura.
- Calcula el siguiente **`BUG-XXX`** mirando `diseño/03-backlog-requerimientos.md` y **añade una línea**
  (un BUG **no** lleva carpeta de diseño: va como línea en el backlog + luego CHANGELOG), con el síntoma y la
  causa en el resumen.

### 3. (opcional) Confirmar que es un BUG y no otra cosa

Si al leerlo resulta que **no** es un fallo de algo que ya funcionaba —sino valor nuevo (REQ) o una mejora
(MEJ)— **dilo y propón `correo-a-tareas`** en su lugar. No fuerces un BUG donde no lo hay.

### 4. 🛑 FRENO — enseñar y esperar el OK

Antes de tocar ClickUp, muéstrale a Pablo:
1. **La captura**: síntoma, causa raíz sospechada, cómo reproducir, y la respuesta a "¿cómo me enteraría?".
2. **Exactamente lo que se crearía** en ClickUp: título (`BUG-XXX · <título>`), tag, cuerpo y las subtareas.
3. Si ya hay un bug de ese correo/BUG en el board (ver dedup), **dilo aquí**.

Y **para**. No se sigue hasta un "ok / dale / créalo" claro. Si pide cambios, se ajustan y se re-enseña.

### 5. Crear en ClickUp (sólo tras el OK)

**Antes de crear, comprobar duplicados.** Busca en la lista por el tag `bug-xxx` o por el título `BUG-XXX`.
Si ya existe, **no lo dupliques** — informa.

> ⚠ **Los tags de ClickUp deben existir antes en el Space** (`add_tag_to_task` falla si no, y desde aquí no
> se crea un tag). El dedup se apoya en DOS marcas: el `BUG-XXX` del **título** (siempre fiable) y el **tag**
> (mejor para filtrar, si existe). Intenta el tag; si falla, sigue igual y pídele a Pablo que lo cree.

**Tarea del bug** en la lista Automatizaciones (`901219597730`), estado `pendiente`:
- **Título:** `BUG-XXX · <título corto del síntoma>`.
- **Tag:** `bug` (y `bug-xxx` si existe).
- **Descripción:** **Síntoma** · **Causa raíz (sospechada)** · **Cómo reproducir** · la respuesta a "¿cómo me
  enteraría si devolviera un resultado incompleto?" · y al final `Origen: correo «<asunto>» — <fecha>`.

**Subtareas** = la disciplina de arreglo, para que viaje al board (no se ejecuta ahora, sólo se deja escrita):
1. **Reproducir con un test de regresión en ROJO** (que falle con el bug presente).
2. **Arreglar** hasta que el test pase.
3. **Verificar rompiendo el código a propósito**: deshacer el arreglo y comprobar que el test vuelve a rojo.

Al terminar, dale a Pablo **los enlaces** (URL del bug y cuántas subtareas). Si algo falló a medias, **dilo**.

## Al terminar

Resume: qué correo se leyó, el BUG-XXX registrado (síntoma en una línea), qué se creó en ClickUp con sus
enlaces, y qué queda (arreglarlo en una sesión de código, con su test). Si el buzón o el board no
respondieron como se esperaba, **dilo** — aquí se *verifica de verdad, no se asume*.
