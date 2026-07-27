# REQ-008 · Módulo de Recursos Humanos (RRHH) — Fase 1
- Estado: 📐 Diseñado (Fase 1) · Fecha: 2026-07-27
- Área: RRHH (dominio nuevo)
- Origen: petición del **Comité de Dirección** (referencia: Factorial). Análisis funcional+técnico de Pablo
  (CTO), 23/07/2026 → [`docs/requerimientos/Analisis_Requerimientos_RRHH_Yorga.docx`](../../../docs/requerimientos/Analisis_Requerimientos_RRHH_Yorga.docx).

## Problema de negocio

Hoy la gestión de personal del grupo vive en **hojas de cálculo y partes de fichaje en papel**. El Comité
pide una herramienta propia, sencilla y consolidada dentro del panel Yorga. **Fase 1** cubre tres áreas:
ficha de empleado + organigrama, fichaje diario de jornada, y ausencias/vacaciones. El objetivo es dejar de
depender de lo externo/manual y sentar una base ordenada sobre la que crecer (documentos, nóminas, evaluación
más adelante).

## Alcance

**Dentro de la Fase 1:**
- **Empleados y organigrama** — ficha de personal y estructura organizativa (multimarca).
- **Fichajes y horarios** — digitalización del parte diario, **con acceso móvil desde el arranque**.
- **Ausencias y vacaciones** — solicitud, aprobación y control de saldos.

**Fuera de esta fase** (se dice para gestionar expectativas): nóminas y su cálculo, gestión documental y
firma, onboarding completo, evaluación de desempeño, gastos y reclutamiento. → **Regla:** dejar el modelo de
datos **preparado** para documentos y nóminas (campos bancarios opcionales) aunque no se construyan ahora.

## Arquitectura y frontera de acoplamiento (la decisión de fondo)

Es lo que marca qué se comparte con el panel actual y qué no. **Decidido y confirmado con Pablo:**

| Se comparte | Se mantiene independiente |
|---|---|
| **Solo la identidad y el acceso**: el empleado entra con el **login y usuario que ya existen** (un correo por persona). No hay login nuevo ni segunda contraseña. | **Todo el dominio de RRHH**: roles, log de actividad, ficha, organigrama, fichajes, ausencias — **modelo de datos y almacenamiento propios**. El resto del panel no conoce estos datos (protege dato personal sensible). |

- **Autorización en dos capas:** el sistema actual dice **quién eres** (autenticación); el módulo RRHH decide
  **qué puedes hacer** dentro de él con **sus propios roles**. **NO se reutiliza el módulo de Roles del panel
  (REQ-006)** — REQ-006 es un catálogo de *features* plano; RRHH necesita visibilidad **jerárquica** (un
  responsable solo ve su rama) y aislamiento del dato sensible. Son modelos distintos a propósito.
- **Log de actividad propio:** se **replica el patrón append-only de REQ-007** dentro del módulo (fichajes y
  correcciones son solo-añadir), no se cuelga del log del panel.
- **Acoplamiento asumido:** el módulo depende en funcionamiento de que el auth esté disponible (si el acceso
  cae, nadie ficha). Aceptable: los datos están separados, solo se comparte la puerta de entrada.

## Roles y permisos (propios del módulo, jerárquicos)

Cuatro perfiles, montados sobre la identidad compartida. Visibilidad **jerárquica** por organigrama.

| Perfil | Qué puede hacer |
|---|---|
| **Empleado** | Fichar, ver su ficha, solicitar ausencias, consultar su calendario y saldo. |
| **Manager / Responsable** | Lo del empleado + aprobar/rechazar ausencias y ver los fichajes de **su equipo** (su rama del organigrama). |
| **RRHH** | Gestión completa de plantilla, calendarios laborales, políticas de vacaciones, corrección de fichajes con traza, informes. |
| **Admin** | Todo lo de RRHH + configuración global + registro de actividad completo. |

## Módulo A · Empleados y organigrama

- Ficha con datos personales, de contacto, laborales (puesto, departamento, centro/marca, tipo de contrato,
  jornada, fechas de alta/baja) y **bancarios opcionales** (de cara a futura nómina).
- Alta / edición / **baja que archiva** (conserva histórico, no borra) / reactivación.
- **Asignación de responsable** a cada empleado → **organigrama automático**, visual y navegable, por
  departamento y por centro, **multimarca** (Coolway y demás enseñas de Yorga, segmentado — ver decisiones).
- **Vínculo 1:1 obligatorio empleado↔usuario por correo:** dar de alta un empleado implica que tenga (o se le
  cree) su cuenta de acceso. **El alta de la cuenta la hace la jefa de RRHH** (ver decisiones).

## Módulo B · Fichajes y horarios

Digitaliza el parte diario que hoy se firma en papel. Se acaban los partes físicos, el cómputo es automático.

- Fichaje de entrada/salida e inicio/fin de pausa, con **marca de tiempo del SERVIDOR** (no del dispositivo).
- **Acceso móvil desde el arranque** (ver decisiones): fichar y consultar la jornada desde el móvil.
- Vista "mi jornada de hoy" + histórico personal descargable por el propio empleado.
- **Corrección solo RRHH/Admin, siempre con traza** (quién, cuándo, valor anterior y nuevo).
- Cuadro de mando RRHH: quién está fichado ahora + incidencias (jornadas sin cerrar, exceso de horas).
- Horarios teóricos y turnos por empleado/grupo; cómputo automático de horas y **detección de horas extra**.
- **Registro solo-añadir:** un fichaje no se edita ni se borra; se corrige insertando un asiento nuevo que
  referencia al anterior. Mismo patrón que la pantalla de Actividad (REQ-007).

## Módulo C · Ausencias y vacaciones

- **Catálogo configurable de tipos** (vacaciones, baja médica, permiso retribuido, asuntos propios,
  maternidad/paternidad…), cada uno con sus reglas: si computa saldo, si requiere aprobación, si requiere
  justificante.
- Solicitud del empleado (día completo o medio día, motivo, adjunto opcional).
- **Flujo de aprobación** al responsable y/o RRHH, con notificación y estados (pendiente/aprobada/rechazada).
- **Saldo de vacaciones** por empleado: devengo anual configurable, disfrutados, pendientes, arrastre del año
  anterior.
- **Calendarios:** de equipo (el responsable ve solapes antes de aprobar), global (RRHH) y **laborales por
  centro** (festivos nacional/autonómico/local que descuentan correctamente).
- **Coordinación con el fichaje:** un día aprobado como ausencia **no** genera incidencia de "jornada sin
  fichar".

## Decisiones cerradas (con Pablo, 27/07)

1. **Fichaje móvil en Fase 1: SÍ.** Entra desde el arranque → condiciona el diseño del fichaje (mobile-first /
   web adaptada).
2. **Organigrama multimarca: SÍ, segmentado** por marca/centro (no una plantilla Yorga única). La visibilidad
   y los permisos respetan esa segmentación.
3. **Alta de la cuenta: la crea la jefa de RRHH.** No hay auto-registro: al dar de alta un empleado, RRHH crea
   o enlaza su cuenta de acceso (por correo).
4. **Integración con nómina: sin decidir aún.** Se deja el modelo preparado (campos bancarios opcionales); no
   se elige sistema ni se construye. A retomar cuando se sepa qué se usa hoy.
5. **Retención de datos personales:** los **plazos** los fija la **asesoría legal** (RGPD/LOPD) — no bloquea
   esta fase. Lo que sí hacemos: el modelo **soporta anonimización/borrado** de un empleado y su histórico
   cuando llegue el plazo.

## Consideraciones técnicas transversales

- **Integración:** área nueva **"Personas"** en el panel, con datos y lógica propios. Único punto de contacto
  con el sistema actual: la identidad por correo.
- **Seguridad y protección de datos:** dato personal, parte especialmente sensible (bajas médicas). Control de
  acceso por rol + jerarquía, **cifrado de campos sensibles**, mínimo acceso, **registro de accesos** y
  política de conservación. El almacenamiento separado facilita el aislamiento.
- **Notificaciones:** en la app y por correo (el del usuario): solicitud pendiente, aprobación/rechazo,
  jornada sin cerrar, recordatorio de fichaje.
- **No funcionales:** alta disponibilidad en horas punta de fichaje, timestamps de servidor con zona horaria
  correcta, trazabilidad completa, exportación PDF/Excel, y **acceso móvil** (decidido: sí).

## Encaje en nuestro stack

- **API** (NestJS hexagonal): dominio nuevo `rrhh/` con submódulos (empleados, fichajes, ausencias), su
  `RrhhRole` + **guard jerárquico** (por rama del organigrama), y un `RrhhActivityRecorder` (patrón REQ-007).
  Migraciones Prisma propias: `employee`, `department`, `center`, `time_entry` (append-only), `absence`,
  `absence_type`, `leave_balance`, `work_calendar`…
- **Enlace identidad:** `employee.userId` 1:1 con `User` (por `email`).
- **Web** (React hexagonal): área "Personas" en el sidebar; visibilidad por rol RRHH.
- **Reutilizamos patrones ya probados:** tabla explorable (REQ-002), CRUD gestionable (REQ-004), append-only +
  auditoría (REQ-007), y el login/identidad (REQ-006 solo para *entrar*, no para permisos de RRHH).

## Plan de implementación por fases (cada una = su propio bloque: diseño→impl con tests→PR)

- **Fase 0 · Cimientos** — `Employee` + `Department`/`Center` + enlace de identidad por correo + **roles RRHH y
  guard jerárquico** + esqueleto del área "Personas". Sin esto no hay nada.
- **Fase 1 · Empleados + organigrama** — CRUD de ficha (alta/edición/baja-archiva/reactiva) + asignación de
  responsable → organigrama automático navegable, multimarca.
- **Fase 2 · Fichajes** *(mayor valor operativo inmediato)* — fichar (servidor) **móvil**, "mi jornada",
  corrección con traza, cuadro de mando, cómputo de horas/extra. Append-only.
- **Fase 3 · Ausencias y vacaciones** — catálogo de tipos, solicitudes → aprobación, saldos, calendarios,
  coordinación con fichaje.
- **Fase 4 · Refinos** — notificaciones (app+correo), informes/exportación, pulido móvil.

## Estado de implementación

- **Fase 0 · Cimientos** — ✅ **hecho y en `main`.** `Employee`/`Department`/`Center`, enlace de identidad por
  correo, `RrhhRole` + guard jerárquico (`empleadosVisibles`), esqueleto del área "Personas".
- **Fase 1 · Empleados + organigrama** — 🚧 **en curso.**
  - **Slice 1 · Ficha completa + log propio** — ✅ **hecho** (esta rama). Editar ficha, **dar de baja/reactivar**
    (archiva, no borra: `terminatedAt`), **asignar responsable** con **guardia anti-ciclo** (`crearíaCiclo`), y
    **log de actividad PROPIO de RRHH** (`hr_activity`, append-only, en la misma transacción que el cambio;
    patrón REQ-007 replicado, no reutilizado). Verificado en vivo (alta→editar→responsable→baja→reactivar, 4
    asientos de auditoría; el intento de ciclo devuelve 400 y **no** deja asiento). Break-on-purpose sobre
    `crearíaCiclo` confirmado en rojo.
  - **Slice 2 · Organigrama + centros/departamentos** — ✅ **hecho** (esta rama). **Organigrama visual navegable**
    segmentado por marca (helper de dominio `construirOrganigrama`, testeado: anida el equipo, trata como raíz a
    quien tiene el jefe fuera de su visibilidad, agrupa por enseña). **CRUD de centros (con marca) y
    departamentos** auditado en `hr_activity`; **no se borra** un centro/departamento con empleados (dejaría
    fichas huérfanas). Asignación de centro/departamento en la ficha. **Sidebar**: "Personas" sólo aparece si el
    usuario tiene ficha de empleado (`RrhhContext` resuelve `/rrhh/me` una vez). Sin migración (los modelos
    `Center`/`Department` y las columnas ya venían de Fase 0). Verificado en vivo (crear centro/depto → asignar →
    borrado bloqueado con 400 → reasignar → borrado 204, con sus asientos de auditoría). Break-on-purpose de la
    guardia "no borrar con empleados" confirmado en rojo.
  - **Pendiente Fase 1:** foto/ficha ampliada (datos de contacto, contrato, bancarios) — se hará cuando entre en
    valor; el modelo ya está preparado.

## Próximos pasos

1. Subir **REQ-008** en el backlog de 🆕 a 📐 Diseñado.
2. Arrancar por la **Fase 0** (cimientos: identidad + roles jerárquicos + esqueleto) cuando se dé el OK.
3. Confirmar con la asesoría los plazos de retención (en paralelo, no bloquea) y retomar la decisión de nómina
   cuando se sepa el sistema.
