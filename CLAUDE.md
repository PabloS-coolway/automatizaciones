# CLAUDE.md · Contexto del proyecto

Guía para Claude Code al trabajar en este repo. **Lee también [`ESTADO.md`](ESTADO.md)**: dice
exactamente por dónde vamos y cuál es el siguiente hilo.

## Quién es quién

- **Usuario**: Pablo Silva, **CTO de Grupo Yorga** (grupo valenciano de calzado/moda; marca principal: **Coolway**).
- **Silvia**: la persona de negocio que sufre el trabajo manual. Es quien valida si algo sirve o no.
- **Tomás Sánchez** (IT del grupo): contacto para SAP, extracciones y accesos.

## Cómo trabajamos (importante)

1. **Negocio y arquitectura ANTES de implementar.** Ante un requerimiento nuevo: entender qué resuelve,
   qué dato consume, qué dato produce y quién es su dueño. Sólo después se escribe código.
2. La info cruda que llega (correos, PDFs, Excels) se guarda en [`docs/`](docs/).
3. El diseño de cada iniciativa vive en [`diseño/iniciativas/REQ-XXX/`](diseño/).
4. Existe el comando **`/nuevo-requerimiento`** para el ritual de diseño de un requerimiento nuevo.
5. **Verificar de verdad, no asumir.** Antes de dar algo por bueno: ejecutarlo (curl a la API, o el
   navegador) y enseñar el resultado real. Si algo falla, se dice.

## No todo lo que entra es un requerimiento

Tres tipos, y se gestionan distinto. Detalle en [`diseño/03-backlog-requerimientos.md`](diseño/03-backlog-requerimientos.md).

| Prefijo | Qué es | ¿Ritual de diseño? |
|---|---|---|
| **REQ** | Valor de negocio nuevo | **Sí** → `/nuevo-requerimiento` |
| **MEJ** | Mejora sobre algo existente (UX, rendimiento, DX). No cambia el dato ni su dueño | **No** (sería burocracia) |
| **BUG** | Algo que ya debía funcionar y no funciona | **No**, pero es obligatorio registrar **síntoma + causa raíz + test de regresión** |

**Ante un bug, la regla no se negocia:** antes de darlo por arreglado, **rompe el código a propósito** y
comprueba que el test se pone en rojo. Un test que pasa igual con el bug da falsa seguridad.

**Y la pregunta que hay que hacerse siempre**, porque los peores bugs de este proyecto comparten patrón
(no fallan: **mienten**): *"si esto devolviera un resultado incompleto, ¿cómo me enteraría?"*.

## Reglas de negocio que NO se negocian

- **Los códigos de barras NUNCA se inventan.** El maestro es la única autoridad: se lee, y lo que
  falte **se reporta** (RF-12). Cualquier atajo que "componga" un código es un bug grave.
- **Cuadre obligatorio**: los pares del fichero de etiquetas deben cuadrar con los del pedido.
- **Nunca tocar el Drive de Silvia** directamente. Se trabaja siempre sobre copias en `docs/`.

## Operativa técnica

- **Git**: push y PR **siempre** por el remoto `origin` (alias SSH `github-coolway`) →
  `PabloS-coolway/automatizaciones`. La identidad local del repo ya está configurada (PabloS-coolway).
- **Puertos**: API `:3000`, web `:5173`, Postgres **`:5544`** (host). Si hay que liberar el 3000:
  `fuser -k 3000/tcp`. **Ojo:** el puerto 5173 puede estar ocupado por otro proyecto (kenmei) — no lo mates.
- **No matar** el contenedor de Postgres al limpiar procesos.
- La API con `npm run dev` **no recarga en caliente**: tras tocar el backend hay que reiniciarla.

## Arquitectura

Monorepo (npm workspaces + Turborepo):

```
apps/etiquetas-coolway-api/   NestJS hexagonal (domain / application / infrastructure / interface)
   src/domain      reglas puras (code128, surtidos, género, label-builder, cuadre)
   src/maestro     módulo del maestro (import EAN/UPC, seed del Excel completo, consultas)
   src/auth        login JWT + roles + administración de usuarios
apps/etiquetas-coolway-web/   React + Vite + react-bootstrap (también hexagonal: ports/adapters)
packages/contracts/           @yorga/contracts — tipos y DTOs compartidos API↔web
```

Convenciones: **puertos e implementaciones separadas**; los DTOs compartidos van en `@yorga/contracts`
(no duplicar tipos); comentarios y UI **en español**.

## Puesta en marcha

```bash
cp apps/etiquetas-coolway-api/.env.example apps/etiquetas-coolway-api/.env
npm run setup     # install + Postgres (Docker) + cliente Prisma + migraciones
npm run auth:create-user -- --email tu@email.com --password "…" --name "Tu nombre" --role admin
npm run dev       # API :3000 + web :5173
```

**Skills** (en un clon nuevo): el comando `/nuevo-requerimiento` está versionado, pero el **contenido**
de los skills no (pesa y se reinstala). El `skills-lock.json` sí viaja, así que se restauran con:

```bash
npx skills experimental_install    # restaura los skills desde skills-lock.json
```

La app **pide login**. Roles: `operador` (genera etiquetas, consulta el maestro) y `admin`
(además importa/carga el maestro y gestiona usuarios).

## Antes de dar por terminado un cambio

```bash
npm run typecheck && npm test && npm run build
```

Y commit + push por `origin`. Actualiza [`CHANGELOG.md`](CHANGELOG.md) y [`ESTADO.md`](ESTADO.md)
cuando cierres un bloque de trabajo.
