---
name: pr-coolway
description: Cierra un bloque de trabajo en el repo de automatizaciones de Yorga (Coolway) y lo deja en una PR. Úsalo cuando el usuario diga "pr-coolway", "prepara el PR", "haz el PR" o "cierra este bloque" trabajando en este repo. Crea la rama, verifica que compila y pasa tests, actualiza CHANGELOG.md y ESTADO.md, commitea, pushea por el remoto `origin` (alias SSH github-coolway) y abre la PR con la plantilla del repo. No confundir con el skill `create-pr`, que es de los repos de Iberia y NO pushea.
---

# pr-coolway · Cerrar un bloque de trabajo

Convierte los cambios del working tree en una PR lista para revisar, **sin perder la memoria del
proyecto**: el `CHANGELOG.md` (qué se hizo) y el `ESTADO.md` (dónde vamos) son parte del entregable,
no un extra opcional.

## Reglas que no se saltan

- **Nunca commitear en `main`.** Si la rama actual es `main`, se crea una rama nueva antes de nada.
- **Siempre por `origin`** → alias SSH `github-coolway` (`git@github-coolway:PabloS-coolway/automatizaciones.git`).
  Nunca HTTPS ni `github.com` directo: el usuario tiene varias identidades de GitHub en la máquina.
- **No se pushea sin que la puerta de calidad esté en verde** (typecheck + tests + build).
- **No inventes lo que cambió**: la descripción de la PR sale de leer el diff real, no de la memoria.

## Pasos

### 1. Ver qué hay

```bash
git status --short
git branch --show-current
git diff            # y `git diff --staged` si hay algo en el índice
```

Si no hay cambios, dilo y para: no hay nada que cerrar.

### 2. Crear la rama (si estás en `main`)

Nombre: `<tipo>/<descripcion-corta-en-kebab>`, donde tipo es `feat` | `fix` | `docs` | `chore` | `refactor`.

```bash
git checkout -b feat/lo-que-sea
```

### 3. Puerta de calidad

```bash
npm run typecheck && npm test && npm run build
```

Si algo falla, **se arregla antes de seguir**. No se pushea en rojo.

### 4. Actualizar la memoria del proyecto

- **`CHANGELOG.md`**: entrada nueva arriba del todo, formato *Keep a Changelog* en español, con fecha
  `## [AAAA-MM-DD] Título`, y secciones `### Añadido` / `### Corregido` / `### Cambiado` /
  `### Documentación` según toque. Explica **el porqué**, no sólo el qué.
- **`ESTADO.md`**: actualízalo **sólo si el bloque cambia dónde estamos** (algo pasa a ✅, aparece deuda
  técnica nueva, cambia el "siguiente hilo", o cambia un requisito de arranque). Ajusta también la fecha
  de "Última actualización".

### 5. Commit

Mensaje: una línea corta en español, con prefijo de área (`api:`, `front:`, `docs:`, `setup:`…), igual
que el historial existente. Cuerpo con el porqué si el cambio no es obvio.

Termina el mensaje con:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

### 6. Push por `origin`

```bash
git push -u origin <rama>
```

Verifica antes que `origin` apunta a `github-coolway`:

```bash
git remote -v   # debe decir git@github-coolway:PabloS-coolway/automatizaciones.git
```

### 7. Abrir la PR

La descripción **sigue la plantilla** [`.github/pull_request_template.md`](../../../.github/pull_request_template.md)
y enumera los cambios reales del diff.

Con `gh` instalado y autenticado:

```bash
gh pr create --base main --head <rama> --title "<título>" --body-file <fichero-con-la-descripcion>
```

**Si `gh` no está instalado** (hoy no lo está en la máquina del usuario): no falles en silencio. Escribe
la descripción en un fichero, y dale al usuario el enlace para abrirla en dos clics:

```
https://github.com/PabloS-coolway/automatizaciones/compare/main...<rama>?expand=1
```

GitHub cargará sola la plantilla del repo; el usuario pega la descripción preparada.

## Al terminar

Resume: rama, commit, resultado de la puerta de calidad, qué entró en el `CHANGELOG`/`ESTADO`, y el
enlace de la PR. Si algo quedó pendiente o falló, **dilo** — no lo escondas en el resumen.
