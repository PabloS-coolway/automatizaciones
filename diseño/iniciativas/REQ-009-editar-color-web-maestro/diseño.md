# REQ-009 · Editar "color web" del maestro inline, con permiso por rol
- Estado: 📐 Diseñado (decisiones cerradas) · Fecha: 2026-07-22
- Área: Catálogo (edición de dato del maestro)
- Origen: petición directa de Pablo — 2026-07-22

## Problema de negocio

El **"color web"** (`colorNameWeb`) es un dato descriptivo del maestro. Hoy sólo se puede corregir en
el **Excel origen** (`REFERENCIAS COOLWAY`) y **reimportando** — un rodeo que depende de otra persona
y de una carga. Se quiere corregirlo **directamente en la tabla del maestro, inline** (clic en la
celda, elegir el valor, guardar). Y como el maestro lo tocan varios usuarios, **poder editarlo es un
privilegio del rol**, no algo abierto a todos.

## Sistemas afectados (entradas / salidas / dueño del dato)

- **Entrada:** edición inline de la celda "color web" de una fila del maestro.
- **Salida:** `update` de `Reference.colorNameWeb`, una **marca de "editado a mano"** en esas filas, y
  una entrada en el **log de actividad (REQ-007)**.
- **Dueño del dato — DECISIÓN:** para las filas **editadas a mano**, el dueño pasa a la **web**. El
  *upsert* de importación (`SeedMaster`) **respeta** ese valor y no lo pisa. (Coherente con REQ-004:
  mover un dato de origen → gobernado desde la web.)

## Encaje arquitectónico

- **Permiso (gobernanza):** feature **cerrada** nueva **`maestro.color-web.editar`** en el catálogo de
  REQ-006. Enforcement en el **servidor** (guard sobre el endpoint) y, además, el front oculta el input
  si el rol no la tiene. No basta con ocultar en el front — la regla vive en el servidor.
- **Protección ante reimport (el corazón del REQ):** una marca por-fila en `Reference` —
  `colorNameWebSource` (`'excel' | 'web'`) + `colorNameWebEditedBy` / `colorNameWebEditedAt`— para que
  `SeedMaster` **no sobrescriba** un color web con `source='web'`. Sin esta marca, la edición
  **mentiría** en la siguiente carga (patrón "no falla, miente"). El import, además, **reporta**
  cuántas filas protegidas traen en el Excel un valor distinto (para revisarlas), en vez de callar.
- **Alcance de la edición — DECISIÓN:** editar una celda **propaga a todas las tallas del mismo
  `(ref, color)`**. El "color web" describe el color, no la talla: dejar la 43 con un color web y la 45
  con otro para la misma referencia sería incoherente.
- **Validación — DECISIÓN:** el valor se **elige de los ~408 "color web" existentes** (ya hay endpoint
  de facetas de esa columna, reutilizable como origen del desplegable). Un valor nuevo, sólo de forma
  **explícita**, no por un typo.
- **Auditoría:** el `update` pasa por el `ActivityRecorder` de **REQ-007** → queda **quién** y
  **antes→después**. Editar el maestro es justo la clase de acción que ese log existe para registrar.
- **Capas (hexagonal):** usecase `EditarColorWebUseCase` (application) + puerto de repositorio
  `Reference` con un `updateColorWebByRefColor(...)` + `PATCH` en el controller del maestro. El front:
  celda editable inline en la tabla del maestro (REQ-002), con desplegable de valores existentes.

## Opciones y recomendación

- **Marca de override:** (a) columnas en `Reference` (`colorNameWebSource` + editedBy/At) vs (b) tabla
  `reference_override` aparte. **Recomendado (a)** — es un solo campo editable; una tabla aparte es
  sobre-ingeniería hoy. Si mañana se editan más columnas, se revisita.
- **Dependencias / orden:** se apoya en **REQ-006** (feature nueva) y en **REQ-007** (auditoría). Lo
  razonable es implementarlo **después** de que REQ-007 aterrice, para que el `update` ya nazca
  auditado.

## Preguntas abiertas y riesgos

- **Aviso del import:** ¿el import sólo respeta el override en silencio, o **avisa** cuando el Excel
  trae un color web distinto del editado? Recomendado **avisar** (resumen: N filas con override que
  difieren del Excel) — coherente con "no falla, miente".
- **Valor nuevo:** el flujo de "añadir un color web que no existe" hay que definirlo (¿confirmación
  explícita?, ¿lo puede hacer cualquiera con la feature?).
- Riesgo: que el override se pierda en un `deleteMany`+recreate del seed. Mitigación: el seed debe ser
  *upsert* que preserva el override, nunca borrado+alta.

## Próximos pasos

1. Modelo Prisma: marca de override para `colorNameWeb` (`colorNameWebSource` + editedBy/At) + migración.
2. Feature `maestro.color-web.editar` en el catálogo cerrado de REQ-006 + guard en el servidor.
3. `EditarColorWebUseCase` + `PATCH` endpoint: valida el valor contra los existentes, **propaga al
   `(ref, color)`**, marca `source='web'`, y registra en el `ActivityRecorder` (REQ-007).
4. `SeedMaster`: respeta el override (`source='web'`) y **reporta** las filas que difieren del Excel.
5. Front: celda "color web" editable inline en la tabla del maestro, desplegable de valores existentes,
   visible sólo si `hasFeature('maestro.color-web.editar')`; refresco tras guardar.
6. Tests: el guard niega sin la feature; el import **no** pisa un override; el `update` propaga a todas
   las tallas del `(ref, color)`; el `update` deja entrada en el log. Y romper a propósito: quitar la
   protección del import y ver que un test se pone **rojo**.
