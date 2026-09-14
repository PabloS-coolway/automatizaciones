# REQ-012 · RRHH Fase 2 — multi-sociedad, zona/convenio y registro horario (Ángeles)

- Estado: 🔍 En análisis (pendiente de validar diseño) · Fecha: 2026-09-11
- Área: RRHH · Extiende [REQ-008](../REQ-008-rrhh-fase-1/diseño.md)
- Interlocutora de negocio: **Ángeles** (jefa de RRHH). Origen: correo + Excel
  `docs/requerimientos/REGISTRO HORARIO PRUEBA.xlsx` (un departamento + dos tiendas de dos zonas).

## Problema de negocio

Ángeles necesita llevar el **registro horario legal** de los trabajadores del grupo (obligación de la Ley de
registro de jornada) **reemplazando el sistema actual**, con estas condiciones que hoy el módulo RRHH (REQ-008)
**no** cubre:

1. **Multi-sociedad.** Los trabajadores pertenecen a **sociedades jurídicas distintas** (VANYOR SAU, YORGA SAU,
   MAYUKA SLU) — que no es lo mismo que la marca (COOLWAY, Ulanka…). Su clave de negocio es
   **(número de empresa + código de empleado)**, no un id interno.
2. **Zona geográfica → convenio → permisos.** Lo "superimportante": según la **zona** (Valencia, Las
   Palmas-Canarias…) aplica un **convenio** colectivo, y el convenio determina **qué permisos** tiene cada
   trabajador. Hoy el catálogo de permisos es plano y global.
3. **Ingesta de sus datos.** Debe poder **volcar** altas de nuevos y **bajas definitivas** desde su sistema, o
   dar de alta **desde la tienda** si no se vuelca. El importador actual solo lee email/nombre/rol.
4. **Retención 6 años.** Obligación legal de conservar y **producir el registro a requerimiento**.
5. **2 meses en paralelo** (sistema viejo + nuevo) antes de trasladarlo a todas las tiendas.

## Sistemas afectados (entradas / salidas / dueño del dato)

- **Fuente de verdad de la FICHA del trabajador** = el **sistema de RRHH de Ángeles** (a confirmar cuál). Nosotros
  **consumimos** (volcado/import), **no reescribimos** la ficha (principio "integrar, no reescribir" +
  "1 fuente de verdad por dominio"). El alta manual desde tienda es el *fallback* cuando el volcado no llega.
- **Dueño del REGISTRO HORARIO (fichajes)** = **nuestro módulo** (ya existe append-only con hora de servidor).
- **Produce:** el registro horario y su **export legal** a requerimiento.
- Encaja con "multi-marca + multi-sociedad → visión de grupo": la **Empresa (sociedad)** pasa a ser entidad de
  primera clase, alineada con el contexto de negocio (Yorga opera por varias sociedades).

## Qué YA existe (REQ-008, no se reconstruye)

Fichaje append-only con corrección trazada, organigrama jerárquico, ausencias con aprobación/saldo/calendario,
festivos por centro, auditoría (`HrActivity`), roles RRHH, notificaciones, baja = archivado, export CSV. **El
motor de registro horario existe.** Falta la **capa organizativa (empresa/zona/convenio)**, la **identidad por
empresa+código**, la **ingesta de las 12 columnas de Ángeles** y la **retención formal**.

## Modelo de datos propuesto (el núcleo anti-rework)

Principio: construir ahora **solo lo que el dato ya demuestra**; dejar lo incierto (contenido de
convenio→permisos, sistema origen) como **configuración/datos**, no como estructura.

### Entidades nuevas
- **`hr_company` (Empresa/Sociedad)** — `code` (nº empresa: 16/12/105/120, único), `name` (VANYOR SAU…). *(amarillo A+K)*
- **`hr_zone` (Zona/Área)** — `name` (VALENCIA, LAS PALMAS-CANARIAS), `convenioId?` → convenio aplicable. *(amarillo L)*
- **`hr_convenio`** — `code?`, `name`. Estructura vacía; Ángeles la rellena luego.
- **`hr_convenio_permiso`** (join `Convenio` ↔ `AbsenceType`) — qué permisos aplica cada convenio, con params
  configurables (`diasMax?`, `remunerado?`, `requiereJustificante?`…). **Este join es la clave**: hoy `AbsenceType`
  es global; con el join, el convenio (vía zona) determina el subconjunto y los parámetros de permisos del
  trabajador. Si un convenio no tiene filas → se usa el catálogo global (compatibilidad hacia atrás).
- **Catálogos** (texto libre → catálogo): `hr_categoria` (`code?`,`name`), `hr_contract_type` (`code`,`name`:
  100/200/500/502/510), `hr_seccion` (`code`,`name`).

### Cambios en entidades existentes
- **`Employee`** += `companyId` (FK, per-empleado y **autoritativo**), `employeeCode` (String), **`@@unique([companyId, employeeCode])`** (clave de negocio), `dni`, `categoriaId?`, `contractTypeId?`, `seccionId?`,
  `fechaAntiguedad? @db.Date` (separada de `hiredAt`). *(amarillo B; + DNI/F, sección/G, contrato/H, antigüedad/I)*
- **`Center`** (tienda/centro) += `zoneId?` (FK Zona), `code?` (código de sucursal). El convenio del empleado se
  deriva por `employee.center.zone.convenio`.

### Decisiones de modelado (con su porqué)
- **Empresa per-empleado, no per-centro.** El propio dato lo exige: el "grupo" Sistemas mezcla **VANYOR SAU y
  YORGA SAU**. Si la empresa colgara del centro, no sería representable. Empresa (jurídica) y tienda (agrupador)
  son **ejes independientes**.
- **Zona en el Centro (tienda), no en el empleado.** Ángeles fija la zona **por grupo de tienda**. Un futuro
  override a nivel empleado es un campo nullable → **sin rework**.
- **Convenio→permisos como datos.** Montamos el modelo configurable ahora; el contenido lo pone Ángeles. Cero
  reglas hardcodeadas (evita el rework).

## Importador de fichas HR (las 12 columnas)

Nuevo endpoint `POST /rrhh/import-fichas` (distinto del import de usuarios de login):
- Lee el **Excel agrupado** de Ángeles: filas de **cabecera de grupo** (dept "SITEMAS", "TIENDA SUC.01 ULANKA")
  y filas "Totales" se saltan; la **zona** (col L) va en la 1ª fila del grupo y aplica al grupo/centro.
- Por trabajador hace **upsert idempotente por (companyId, employeeCode)**: crea/actualiza `Company` (code+name),
  `Zone`, `Center` (grupo→centro+zona), catálogos (`ContractType`, `Seccion`, `Categoria`), el `User` de login
  (contraseña temporal) y el `Employee` con **todas** las columnas.
- Informe: creados / actualizados / saltados con motivo (como el importador actual).
- Cubre el **volcado manual** de altas; las **bajas definitivas** se marcan (`active=false`, `terminatedAt`). La
  **sincronización automática** con el sistema de Ángeles se añade después **sin tocar el modelo**.

## Retención 6 años

- Baja = **soft-delete** (ya existe: `active=false` + `terminatedAt`) → el dato **se conserva**. Se añade
  política explícita: **no purgar antes de `terminatedAt + 6 años`** y un **export "a requerimiento"** (registro
  completo de un trabajador/tienda/periodo para inspección). El borrado/anonimización posterior queda para
  cuando la asesoría fije el plazo (REQ-008 ya lo dejó como decisión abierta).

## Qué se hace AHORA (sin Ángeles) vs qué se PARKEA

| Ahora (el dato ya lo prueba, rework ≈ 0) | Parkeado para Ángeles (estructura lista → solo datos) |
|---|---|
| Entidades Empresa, Zona, catálogos, identidad empresa+código, campos de ficha | **Contenido** de convenio→permisos (qué permisos y días da cada convenio) |
| Importador de las 12 columnas + carga de sus datos reales | Mapa **zona→convenio** concreto (qué convenio en cada zona) |
| Retención 6 años + export a requerimiento | **Sincronización automática** con su sistema HR (cuál/format) |
| Modelo Convenio + join convenio-permiso (vacío, configurable) | Alta self-service por tienda (UI) — modelo listo, UI después |

## Opciones y recomendación
Diseño único recomendado (arriba). La única bifurcación real —empresa per-empleado vs per-centro— se resuelve
**per-empleado** por imposición del dato. No se ve otra opción que no genere rework.

## Preguntas abiertas y riesgos (para Ángeles a su vuelta)
1. **Mapa convenio→permisos**: por cada zona/convenio, **qué permisos** concede y con **qué días/condiciones**
   (ella dice que "los trabajadores lo dejan plasmado en el registro actual" → necesitamos esas tablas).
2. **Sistema origen del volcado** y formato/API (o si siempre será Excel manual).
3. **Jerarquía** exacta: empresa ↔ tienda ↔ departamento ↔ sección (¿cómo anidan? ¿el "código sección"
   87/500/86/01 qué representa?).
4. ¿**Todos** los trabajadores necesitan login (para fichar) o solo algunos? (afecta al alta masiva).
5. Riesgo: nombres de sociedad inconsistentes en el propio Excel ("YORGA SAU" vs "YORGA, S.A.U") → normalizar por
   **código de empresa**, no por nombre.

## Próximos pasos
1. **Validar este diseño** (Pablo / y con Ángeles el bloque convenio→permisos).
2. Implementar en rama `feat/req-012-rrhh-multiempresa`: schema + migración + contracts + importador + tests.
3. Cargar sus datos reales (Sistemas + 2 tiendas) y verificar de verdad (API/DB).

## Avance 11-sep (autónomo, rama sin pushear)
- ✅ **Schema + migración + contracts + importador de fichas + tests** (commits `c184c78`→`d9eea32`).
- ✅ **Resolver convenio→permisos** (commit `6b87bf8`): la lógica que *consume* el andamiaje. `GET
  /rrhh/empleados/:id/permisos` → permisos efectivos del trabajador vía `center.zone.convenio`, con **fallback al
  catálogo global** cuando el convenio aún no está relleno (cero regresión con REQ-008). Regla pura en
  `domain/convenio-permisos`, 6 unit tests + **verificación real contra Postgres** (repo Prisma ejercido en
  transacción con rollback, 10/10). typecheck + 379 tests + build en verde.
- ⏳ **Export "a requerimiento" (retención 6 años):** NO implementado a propósito. La retención estructural ya está
  (baja = soft-delete, el dato se conserva). El export legal es **formato-sensible** (registro de jornada tiene
  requisitos legales) → construirlo a ciegas arriesga rework. Fuente de datos lista: `fichaje.historico(emp,
  desde, hasta)`. **Formato propuesto** (CSV, mínimo legal): empresa · nº empleado · nombre · DNI · centro · fecha
  · hora entrada · hora salida · minutos trabajados. Pendiente de un OK de Pablo/Ángeles sobre las columnas antes
  de codificarlo (añadir columnas a un CSV luego es trivial, no "rehacer").
