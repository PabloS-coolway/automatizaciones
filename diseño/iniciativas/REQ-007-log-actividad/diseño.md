# REQ-007 · Log de actividad (auditoría de create/update/delete)
- Estado: 📐 Diseñado (decisiones cerradas) · Fecha: 2026-07-22
- Área: Acceso (gobernanza / trazabilidad)
- Origen: petición directa de Pablo — 2026-07-22

## Problema de negocio

Ahora hay **varios usuarios** operando el sistema (operadores y admins). Cuando alguien edita el
maestro, crea o borra un usuario o un rol, o cambia un destino, **no queda rastro de quién lo hizo ni
de qué cambió**. Con un solo usuario daba igual; con varios, ante un dato que "aparece raro" (un
destino cambiado, un rol tocado, un usuario que ya no está) **no hay forma de reconstruir qué pasó ni
de a quién preguntar**.

Es el patrón que perseguimos en todo el proyecto: que el sistema no **mienta por omisión**. Si algo
cambió, tiene que poder verse. Y encaja como complemento natural de REQ-006: ahora que "quién puede
qué" es un dato gobernable, **"quién hizo qué" también debe serlo**.

## Sistemas afectados (entradas / salidas / dueño del dato)

- **Entrada:** cada mutación de estado persistente de la API — `create` / `update` / `delete` sobre
  las entidades del sistema. Superficie actual (modelos Prisma + controllers verificados):
  **User**, **Role**, **Destination** y las **cargas del maestro (Reference)**. Cada acción aporta:
  usuario autenticado (del JWT), entidad + id, tipo de acción y el estado **antes → después**.
- **Salida:** una tabla nueva **append-only** (p. ej. `activity_entry`) y una vista **"Actividad"** en
  la web que la lista, filtrable y ordenable (reutiliza el filtro/orden servidor de REQ-002).
- **Dueño del dato:** el **propio sistema** — la API es la única que escribe el log. Nadie lo edita ni
  lo borra: es **append-only**. Un log que se puede modificar no vale como auditoría.

## Encaje arquitectónico

Concern **transversal**, capa de **aplicación**. La decisión clave es **dónde se captura**:

- **(A) Interceptor HTTP global (NestJS).** Un solo sitio, barato. Pero desde el interceptor **no se
  conoce el estado "antes"** de forma fiable, y hay que inferir entidad/id de la ruta → frágil. Sólo
  sirve para un log *simple*, sin diff.
- **(B) En los casos de uso, vía un puerto `ActivityRecorder`.** Cada usecase de escritura —que ya
  carga la entidad antes de tocarla— registra `antes → después` con precisión. Hay que pasar por cada
  usecase de escritura (acotado: User, Role, Destination, maestro), pero es el **único que da el diff
  fiable** que se pidió, y respeta la hexagonal (puerto + implementación Prisma).

**Recomendación: (B)**, un puerto `ActivityRecorder` inyectado en los usecases de escritura, con la
implementación Prisma en infraestructura. Se complementa con un interceptor que rellene
automáticamente el **actor** (usuario del JWT) y un `requestId`, para no repetirlo en cada usecase.

Respeta los principios: una sola fuente de la verdad para el log (lo escribe sólo la API) y "empezar
por el dato". Fricción asumida: tocar cada usecase de escritura — pero es justo lo que garantiza que
**no se escape ninguna acción sin registrar**. Un audit incompleto es la peor versión del bug de este
proyecto ("no falla, miente"): da falsa confianza.

## Opciones y recomendación

Recomendado **(B)**. Forma de cada entrada:

```
id, timestamp, actorUserId, actorEmail (snapshot), action (CREATE|UPDATE|DELETE),
entity (USER|ROLE|DESTINATION|MASTER_IMPORT|…), entityId,
before (jsonb, null en CREATE), after (jsonb, null en DELETE), summary
```

- **Vista "Actividad":** admin-only (feature nueva en el catálogo de REQ-006), tabla filtrable por
  usuario / entidad / acción / fecha, con el **diff expandible**.
- **Maestro:** una reimportación **no** genera 5.736 filas — se registra como **una** entrada
  "import maestro" con su resumen (N altas / N cambios). Si no, el log es ilegible.

## Decisiones cerradas (2026-07-22)

- **Visibilidad:** "Actividad" es **sólo admin** — feature nueva del catálogo de REQ-006.
- **Alcance:** **sólo mutaciones de dato** (`create`/`update`/`delete`). Login/logout **fuera** (es
  seguridad, no cambio de dato; mezclarlos ensucia la vista).
- **Etiquetas:** la generación de etiquetas **no** entra — no es CRUD de una entidad persistente. Si
  algún día se quiere trazar, será su propio requerimiento.
- **Retención:** **indefinida por ahora** (volumen bajo: pocos usuarios, pocas mutaciones/día). Se
  añade purga sólo si algún día molesta.
- **Fallo del log:** **transaccional** para las entidades críticas — mejor no hacer el cambio que
  auditarlo mal. El log es parte de la transacción de escritura, no best-effort.
- **Datos sensibles (regla, no opción):** el `before/after` de User **nunca** guarda el hash de
  contraseña ni tokens → redacción de campos sensibles obligatoria.

## Riesgos

- **Que se escape una mutación sin registrar** — un audit incompleto es la peor versión del bug de
  este proyecto ("no falla, miente"): da falsa confianza. Mitigación: el test que **rompe a propósito**
  (desactivar el recorder y ver un test en rojo).
- **Maestro:** una reimportación debe dejar **una** entrada con su resumen (N altas / N cambios), no
  5.736 filas. Si no, el log es ilegible.

## Próximos pasos

1. Migración Prisma: modelo `ActivityEntry` (append-only, `before`/`after` en jsonb).
2. Puerto `ActivityRecorder` + implementación Prisma; engancharlo en los usecases de escritura de
   User, Role, Destination y maestro-import, dentro de la transacción. Redacción de campos sensibles.
3. Endpoint de consulta paginado + filtros (server-side, como el maestro).
4. Vista web "Actividad" (**sólo admin**), reutilizando el filtro/orden de REQ-002; diff expandible.
5. Tests: cada usecase de escritura deja su entrada; el log es append-only; la contraseña **no**
   aparece en el diff. Y el test "romper a propósito": desactivar el recorder en un usecase y
   comprobar que un test se pone **rojo** — garantía de que ninguna acción se escapa sin registrar.
