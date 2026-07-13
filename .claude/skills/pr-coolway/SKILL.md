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
- **Todo cambio de código de producto trae tests.** Si el bloque tocó `src/` y no hay tests que ejerciten
  lo nuevo, **se escriben ANTES de commitear**. No se pide permiso para eso: es parte del trabajo.
- **La cobertura no baja del 75%.** Está enganchada a `npm test`: si baja, los tests fallan solos.
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

### 3. ¿Trae tests lo que has hecho?

**Antes de la puerta de calidad**, revisa el diff y pregúntate: *¿qué comportamiento nuevo hay aquí, y qué
test lo ejercita?* Si el bloque toca `src/` (API o web) y no hay test que cubra lo nuevo, **escríbelo ya**.

Qué se prueba y dónde:

| Lo que cambiaste | Dónde va el test |
|---|---|
| Regla de negocio, cálculo, parser (dominio) | `apps/etiquetas-coolway-api/test/*.spec.ts` |
| Caso de uso (orquestación, informes) | ídem, con fakes de los puertos |
| Lógica del front (motor de tabla, validaciones, casos de uso) | `apps/etiquetas-coolway-web/test/*.spec.ts(x)` |
| Componente con comportamiento (filtros, orden, estados) | ídem, con `@testing-library/react` |

**Un test debe poder fallar.** Antes de darlo por bueno, rompe a propósito el código que cubre y comprueba
que el test se pone en rojo. Un test que pasa igual con el bug es peor que no tenerlo: da falsa seguridad.

**Lo que NO se cubre con tests** (y por qué): controladores HTTP, adapters de Prisma/Excel, páginas React y
cableado de dependencias. Son pegamento e I/O: se verifican **ejecutando la app de verdad** (curl a la API,
o el navegador). Están excluidos de la medición de cobertura a propósito — meterlos sólo hundiría el
porcentaje sin decir nada útil. Ojo con la consecuencia: **los fallos de presentación (un sticky roto, un
checkbox que no desmarca) NO los caza la cobertura.** Eso se caza probando la app.

### 4. Puerta de calidad (incluye cobertura ≥ 75%)

```bash
npm run typecheck && npm test && npm run build
```

`npm test` **mide la cobertura y falla si baja del 75%** (statements/functions/lines; 70% en branches), tanto
en la API (Jest) como en la web (Vitest). No hay que acordarse: está en `jest.config.js` y en `vite.config.ts`.

Si algo falla, **se arregla antes de seguir**. No se pushea en rojo, y **no se baja el umbral para que pase**:
si la cobertura cae, es que falta un test.

### 5. Actualizar la memoria del proyecto

- **`CHANGELOG.md`**: entrada nueva arriba del todo, formato *Keep a Changelog* en español, con fecha
  `## [AAAA-MM-DD] Título`, y secciones `### Añadido` / `### Corregido` / `### Cambiado` /
  `### Documentación` según toque. Explica **el porqué**, no sólo el qué.
- **`ESTADO.md`**: actualízalo **sólo si el bloque cambia dónde estamos** (algo pasa a ✅, aparece deuda
  técnica nueva, cambia el "siguiente hilo", o cambia un requisito de arranque). Ajusta también la fecha
  de "Última actualización".

### 6. Commit

Mensaje: una línea corta en español, con prefijo de área (`api:`, `front:`, `docs:`, `setup:`…), igual
que el historial existente. Cuerpo con el porqué si el cambio no es obvio.

Termina el mensaje con:

```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

### 7. Push por `origin`

```bash
git push -u origin <rama>
```

Verifica antes que `origin` apunta a `github-coolway`:

```bash
git remote -v   # debe decir git@github-coolway:PabloS-coolway/automatizaciones.git
```

### 8. Dejar la PR lista (la abre el usuario, a mano)

**No uses `gh`, y no propongas instalarlo.** Decisión tomada: el usuario tiene varias identidades de
GitHub en la máquina (Coolway e Iberia) y `gh auth` toca configuración global de git — el riesgo de
enredar las credenciales no compensa ahorrarse un clic.

En su lugar, deja la PR a un clic:

1. Escribe la descripción en un fichero (sigue la plantilla
   [`.github/pull_request_template.md`](../../../.github/pull_request_template.md) y enumera los cambios
   **reales del diff**).
2. Pega la descripción también en el chat, para que el usuario la copie sin abrir ficheros.
3. Dale el enlace:

```
https://github.com/PabloS-coolway/automatizaciones/compare/main...<rama>?expand=1
```

GitHub carga sola la plantilla del repo; el usuario pega encima la descripción preparada y crea la PR.

## Al terminar

Resume: rama, commit, resultado de la puerta de calidad, qué entró en el `CHANGELOG`/`ESTADO`, y el
enlace de la PR. Si algo quedó pendiente o falló, **dilo** — no lo escondas en el resumen.
