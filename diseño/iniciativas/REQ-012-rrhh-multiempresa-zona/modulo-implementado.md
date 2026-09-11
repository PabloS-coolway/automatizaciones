# REQ-012 · Módulo RRHH Fase 2 — documentación de lo implementado

> Estado: implementado en la rama `feat/req-012-rrhh-multiempresa` (sin merge). Verificado con checks
> (`typecheck` + `test` + `build`) y smoke en vivo por API. Falta: validación de diseño + revisión + merge, y el
> contenido de negocio que aporta Ángeles (mapa zona→convenio y permisos de cada convenio).

Este documento describe **qué se construyó** sobre REQ-008 (RRHH Fase 1). El "porqué" y las decisiones de
modelado están en [`diseño.md`](diseño.md); las preguntas abiertas para Ángeles, en
[`datos-y-preguntas-angeles.md`](datos-y-preguntas-angeles.md).

## 1. Qué resuelve

Llevar el **registro horario legal** multi-sociedad del grupo, con la capa organizativa que REQ-008 no tenía:
sociedades jurídicas, zonas geográficas, convenios y los **permisos que cada convenio concede**, más la ingesta
masiva de las fichas desde el Excel de RRHH.

## 2. Modelo de datos (entidades nuevas)

- **Company (`hr_company`)** — sociedad jurídica (VANYOR SAU, YORGA SAU, MAYUKA SLU…). Clave: `code` (nº de
  empresa). Es **per-empleado** (un mismo grupo, p.ej. Sistemas, mezcla sociedades).
- **Zone (`hr_zone`)** — zona/área geográfica (VALENCIA, LAS PALMAS-CANARIAS…). Apunta a un **convenio**.
- **Convenio (`hr_convenio`)** — convenio colectivo. Se rellena de contenido con Ángeles.
- **ConvenioPermiso (`hr_convenio_permiso`)** — join Convenio↔AbsenceType: **qué permisos concede cada convenio**,
  con `diasMax` y `remunerado`. Si un convenio no tiene filas → se usa el catálogo global (compat REQ-008).
- **Catálogos**: `hr_categoria`, `hr_contract_type`, `hr_seccion`.
- **Employee** += `companyId`, `employeeCode` (con `@@unique([companyId, employeeCode])` = clave de negocio),
  `dni`, `categoriaId`, `contractTypeId`, `seccionId`, `fechaAntiguedad`.
- **Center** += `zoneId` (la zona vive en el centro), `code`.

**Regla de permisos (el núcleo):** el convenio de un empleado se deriva por `employee.center.zone.convenio`. El
resolver devuelve los permisos de ese convenio; si el convenio está vacío o el empleado no tiene zona/convenio,
cae al catálogo global de tipos de ausencia.

## 3. Backend (NestJS hexagonal)

### Importador de fichas — `POST /rrhh/import-fichas`
Lee el **Excel agrupado** de RRHH (12 columnas). Salta cabeceras de grupo y "Totales"; arrastra la zona dentro del
grupo. Por trabajador hace **upsert idempotente por (empresa + código)**: empresa, zona, catálogos, el **centro**
(si el grupo es una tienda) o el **departamento** (si no lo es, p.ej. SISTEMAS), el usuario de login (contraseña
temporal) y la ficha. Reimportar **actualiza, no duplica**. Informe: creados / actualizados / saltados con motivo.
- Heurística tienda vs departamento: el grupo se trata como **tienda→centro** si el nombre contiene
  `TIENDA`/`SUC.`; en otro caso, **departamento**. (A confirmar con Ángeles en la jerarquía.)

### Resolver de permisos — `GET /rrhh/empleados/:id/permisos`
Devuelve los permisos efectivos del empleado (zona→convenio→permisos, con fallback global) + `fuente`
(`convenio` | `global`). Regla pura en `domain/convenio-permisos.ts`.

### Catálogos de ficha — `GET /rrhh/catalogos`
Empresas, categorías, contratos y secciones para poblar los selects del formulario de empleado.

### Gestión maestra — `/rrhh/maestros/*` (RRHH/Admin)
CRUD de **empresas, zonas (con convenio), convenios, categorías, contratos y secciones**, más el **editor
convenio→permisos** (`GET`/`PUT /rrhh/maestros/convenios/:id/permisos`) y `GET /rrhh/maestros/tipos-ausencia`.
No deja **borrar** una entidad en uso (empresa/categoría/contrato/sección con empleados, zona usada por centros,
convenio usado por zonas): avisa con el conteo. Choques de código/nombre único → error claro (no 500).

Arquitectura: `application/` (servicios + puertos), `infrastructure/` (adapters Prisma),
`interface/http/` (controllers). DTOs compartidos en `@yorga/contracts`.

## 4. Front (React + react-bootstrap) — dentro de "Personas"

- **Ficha de empleado** (pestaña Plantilla → editar/nuevo): formulario a tamaño grande con los campos REQ-012
  (sociedad, código, DNI, categoría, contrato, sección, antigüedad) y, al editar, el panel **"Permisos por
  convenio"** (solo lectura).
- **Importar fichas**: botón que abre el asistente de subida del Excel + informe + descarga de credenciales.
- **Maestros** (pestaña nueva, solo RRHH/Admin): gestión de empresas, zonas, convenios (con su **editor de
  permisos**), categorías, contratos y secciones.

## 5. Retención (6 años)

La retención estructural ya está: la baja es **archivado** (`active=false` + `terminatedAt`), el dato se conserva.
El **export legal "a requerimiento"** queda pendiente de confirmar su formato antes de codificarlo (ver diseño).

## 6. Estado de verificación

- `npm run typecheck` + `npm test` (398 tests) + `npm run build`: verde.
- Smoke en vivo por API: importación real (18 altas, reimport idempotente), editor de permisos reflejado por el
  resolver, guardas de borrado a 400, distinción tienda/departamento.
