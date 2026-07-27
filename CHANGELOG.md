# Changelog

Registro de avances del proyecto de automatizaciones de Yorga.
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/).

## [2026-07-27] REQ-008 · RRHH Fase 1 (Slice 2) — organigrama + centros/departamentos

Cierra la Fase 1 de RRHH: la estructura organizativa y su vista.

### Añadido
- **Organigrama visual navegable**, **segmentado por marca** (multimarca). Se construye en un helper de dominio
  (`construirOrganigrama`) testeado: anida el equipo bajo su responsable, trata como **raíz** a quien tiene el
  jefe fuera de su visibilidad (para que su rama no quede huérfana) y agrupa por enseña.
- **Gestión de centros (con marca) y departamentos** (CRUD) auditada en el log propio de RRHH. **Un
  centro/departamento con empleados no se borra** — reasignar antes; lo impide la API con mensaje claro.
- **Asignación de centro y departamento** en la ficha del empleado (selectores en el alta/edición).
- **Sidebar**: la entrada **«Personas» sólo aparece si el usuario tiene ficha de empleado** (nuevo `RrhhContext`
  que resuelve `/rrhh/me` una vez y comparte "¿soy empleado / puedo gestionar?").

### Verificado
- typecheck + **240 tests API** + **web** (organigrama con 4 casos, incl. ciclo defensivo) + build. La guardia
  "no borrar centro con empleados" verificada **rompiéndola a propósito** (el test cae).
- **En vivo:** crear centro/departamento → asignarlos a un empleado → **borrado bloqueado (400)** → reasignar →
  **borrado (204)**, con sus asientos `CENTRO`/`DEPARTAMENTO` en `hr_activity`. **Sin migración** (los modelos ya
  venían de la Fase 0).

## [2026-07-27] REQ-008 · RRHH Fase 1 (Slice 1) — ficha completa + log propio

Con la Fase 0 (cimientos: identidad + roles jerárquicos + esqueleto "Personas") ya en `main`, este bloque
completa la **gestión de la ficha del empleado** y estrena el **log de actividad propio de RRHH**.

### Añadido
- **Editar ficha, dar de baja/reactivar y asignar responsable** (organigrama). La baja **archiva** (marca
  `terminatedAt`, no borra) y conserva histórico; reactivar lo revierte.
- **Guardia anti-ciclo** (`crearíaCiclo`): un subordinado (directo o indirecto) no puede pasar a ser el
  responsable de su propio jefe — el organigrama nunca queda imposible. Devuelve 400 con mensaje claro.
- **Log de actividad PROPIO de RRHH** (`hr_activity`, append-only): cada alta/edición/baja/reactivación deja
  un asiento (actor, acción, antes→después, resumen) en la **misma transacción** que el cambio. Replica el
  patrón de REQ-007, **no** se cuelga del log del panel (dato personal aislado).
- **Pantalla «Personas»**: acciones por fila (editar / baja / reactivar), columna de responsable y selector de
  responsable en el formulario. Alta y edición comparten el mismo modal.

### Verificado
- typecheck + **232 tests API** + build. `crearíaCiclo` verificado **rompiéndolo a propósito** (los tests de
  dominio y de servicio caen en rojo). Cobertura de `rrhh.service.ts` 73% ramas / 93% líneas.
- **En vivo** (curl contra la API real): alta→editar→asignar responsable→baja→reactivar deja **4 asientos** en
  `hr_activity`; el intento de ciclo devuelve **400 y no deja asiento** (el log no miente). *La migración se
  aplica sola en el deploy.*

## [2026-07-27] REQ-011 · Surtidos por prefijo de referencia (rediseña REQ-010 Fase 2)

Silvia probó los surtidos por referencia (REQ-010 Fase 2) y dijo que era "un rollo". Los quería **por
prefijo, como la sociedad**: las `76*` (chica) con unos surtidos y las `86*` (chico) con otros. Este bloque
lo rehace.

### Cambiado
- **De "por referencia" → "por grupo de prefijo".** Nueva tabla `poda_surtido (grupo, codigo)` que **sustituye**
  la `surtido` (ref→SURTD, que estaba vacía en prod) + migración con **seed** de las dos listas que pasó Silvia.
- **Pantalla «Surtidos»** rehecha: dos listas (76 chica / 86 chico) donde da de alta/quita códigos SURTD.
  Extensible a más grupos. Mutaciones auditadas (REQ-007).
- **Al podar**, un nuevo control **«Aplicar surtidos»** deja el fichero de surtidos sólo con los códigos del
  grupo del **prefijo de cada familia**. Sin activarlo, se conservan todos. **Ya no hace falta cruzar con el
  borrador** — el prefijo está en la propia familia del fichero: más simple y más rápido.

### Verificado
- typecheck + build + **228 tests API** + web (cobertura 98%). Filtro por prefijo verificado **rompiéndolo a
  propósito** (el test cae). *La migración se aplica sola en el deploy.*
- **BUG-007 (arreglado en este mismo bloque):** el Excel nuevo de Silvia traía la Horma rellena (BUG-006
  resuelto por su lado) pero tenía una **peculiaridad de ZIP** que exceljs no abría, aunque el contenido era
  válido. Ahora el **lector del borrador es tolerante**: si exceljs falla, re-normaliza el zip con `fflate` y
  reintenta (contenido intacto). **Verificado ejecutando la poda con el fichero original** → lo lee y saca las
  96 (antes fallaba al leer). Adapter de Excel → se verifica ejecutando (convención del proyecto).

## [2026-07-27] REQ-008 · Módulo RRHH — diseño + Fase 0 (cimientos)

Arranca el módulo de Recursos Humanos que pidió el Comité (tipo Factorial acotado). Este bloque deja el
**diseño de la Fase 1** cerrado y **construida la Fase 0 (cimientos)**: el módulo ya existe, aislado del resto
del panel, compartiendo **sólo la identidad** (login/usuario por correo).

### Documentación
- **Diseño de REQ-008 Fase 1** (`diseño/iniciativas/REQ-008-rrhh-fase-1/diseño.md`), a partir del análisis del
  Comité (`docs/requerimientos/Analisis_Requerimientos_RRHH_Yorga.docx`). Frontera de acoplamiento explícita:
  se comparte la identidad; roles, log, ficha, organigrama, fichajes y ausencias son **independientes** (no
  reutiliza REQ-006). Decisiones cerradas: móvil sí, organigrama multimarca, la cuenta la crea RRHH, nómina
  pendiente, retención con asesoría.

### Añadido (Fase 0 · cimientos)
- **Modelo de datos propio** (`hr_employee`, `hr_department`, `hr_center`) + migración. El empleado se enlaza
  1:1 con el `User` del login por correo; la baja **archiva** (`active=false`), no borra. Campos bancarios
  opcionales, preparados para una futura nómina.
- **Roles RRHH jerárquicos** (Empleado / Manager / RRHH / Admin) con **visibilidad por organigrama**: un
  responsable ve **su rama completa** (directos e indirectos), RRHH/Admin toda la plantilla, el empleado sólo
  a sí mismo. Regla pura y **testeada con break-on-purpose**.
- **API** `GET /api/rrhh/me`, `GET /api/rrhh/empleados` (según visibilidad) y `POST /api/rrhh/empleados` (alta
  por RRHH, enlazando a un usuario existente — RRHH **no crea logins**), con un guard que exige ser empleado.
- **Web**: área **«Personas»** en el panel (ficha propia + plantilla visible + alta para RRHH).

### Verificado
- typecheck + build + **227 tests API** + web (cobertura 98%). Visibilidad jerárquica y validaciones del alta
  verificadas; la regla del manager, **rompiéndola a propósito** (el test cae). *La migración se aplica sola en
  el deploy.*

## [2026-07-24] REQ-010 · Poda configurable: elegir sociedad y surtidos (Fases 1 y 2)

La poda de REQ-005 pasa de "sólo filtrar" a "filtrar + configurar", con dos cosas que Silvia hacía a mano
fichero a fichero. **Nunca compone una línea nueva:** reescribe un campo que ya existe (sociedad) o deja
pasar sólo lo elegido (surtidos).

### Añadido · Fase 1 · Sociedad
- **Selector de sociedad** (VANYOR `2000` / COOLWAY USA `4000`) al podar. La poda **reescribe** el código en
  las columnas **verificadas contra los ficheros reales**: materiales `idx1/idx2`, surtidos `idx1`, tarifa
  **A906 `idx4` (VKORG)** — no la "col 3" del correo, que es `KSCHL`; A073 no la lleva.
- **Defensivo (regla "no falla, miente"):** sólo reescribe una columna que **ya contiene** un código de
  sociedad; si no, **no la toca y avisa** («no se pudo reescribir la sociedad en N líneas»), para no subir a
  SAP un fichero corrupto en silencio.

### Añadido · Fase 2 · Surtidos
- **Catálogo de surtidos** (`ref → SURTD`), gestionable desde la web (pantalla **Surtidos**, patrón REQ-004),
  con su tabla `surtido`. Silvia asigna **un surtido por referencia**; toda mutación queda en el log de
  actividad (REQ-007).
- Al podar, el fichero de surtidos conserva **sólo el `SURTD` asignado** a cada ref (vía el mapa
  `(familia,color)→ref` del borrador), en vez de arrastrar todos los que propone Access. Sin asignación para
  una ref, se conservan todos (opt-in por ref). Requiere `maestro.cargar`.

### Verificado
- typecheck + build + **214 tests API** + web (cobertura 98%). Regla de sociedad y filtro de surtidos
  verificados **rompiéndolos a propósito** (los tests caen).
- **En vivo (API + Postgres, con los ficheros reales del 24/07):** migración `surtido` aplicada; la sociedad
  se reescribió en **A906 `idx4`** (la columna verificada) y **A073 quedó intacto**; el aviso de BUG-006 saltó
  con **96 refs sin color**; el CRUD de surtidos (crear/validar/listar/borrar) y su **auditoría** (REQ-007)
  funcionan. La verificación destapó que un SURTD en minúscula no casaría → se **normaliza a mayúsculas**.
- *Nota:* la poda por color de materiales/surtidos con el borrador real da 0 líneas porque ese borrador **no
  trae la Horma** (BUG-006): Silvia debe rellenarla; el sistema ahora lo avisa en vez de mentir.

## [2026-07-24] BUG-006 · Poda: borrador sin código de color (Horma vacía) — avisar, no mentir

Silvia podó el bor.14 (608 reg) y salieron **0 líneas** en materiales, con las compras marcadas como "no
aparecen" — aunque **sí estaban** en el fichero. Esperaba 96.

### Corregido
- **Causa raíz (verificada con los ficheros del 24/07):** el borrador `compr poda materiales.xlsx` trae la
  columna **Horma (código de color SAP) vacía en 61 de 96 compradas** (el color sólo venía como nombre:
  ASH, GRS…). El lector saca el color de Horma → `''` → no casa con el color del materiales (500, 550…) →
  todo anulado; y esas compras se colaban en el aviso "no aparece" (parecía **fichero incompleto**). También
  explicaba el "18 vs 96" (sin color, 96 refs colapsan a 18 familias). **Familia "no falla, miente".**
- **Arreglo:** nuevo `comprasSinColor` que **detecta y avisa** con claridad («N referencias sin código de
  color en el borrador — rellena la Horma»); esas compras ya **no** ensucian `compradoQueFalta` (que sigue
  significando "el fichero de SAP vino incompleto"). Las **tarifas** (casan por familia sola) no se tocan.
- **Test:** `poda.spec.ts` — verificado **rompiendo el arreglo a propósito** (el test cae). 204 tests API,
  typecheck + build en verde.

### Documentación
- **REQ-010** (🔍 En análisis) · «Poda configurable: elegir sociedad y surtidos», del mismo correo. Diseño en
  `diseño/iniciativas/REQ-010-poda-configurable/`. Se entregará en dos fases (sociedad → surtidos). El correo
  crudo queda en `docs/requerimientos/correo-fichero-materiales-y-bd-2026-07-23.md`.

## [2026-07-22] MEJ-003 + MEJ-004 · Navegación por módulos y pantalla de inicio

Dos mejoras de interfaz (sin tocar dato ni dueño), juntas en una PR.

### Cambiado
- **MEJ-003 · Navegación agrupada por módulos** (antes era plana). El menú se organiza en grupos con
  título — «Etiquetas y colección», «Administración», «Próximamente» — más «Inicio» suelto arriba. Un
  grupo cuyas entradas no son visibles para el rol **no se pinta**. Preparación para el módulo de RRHH
  (REQ-008), donde la lista plana se quedaba corta.
- Se **retira «Tarifas y surtidos»** del menú y su ruta `/tarifas` (ya no aporta).

### Añadido
- **MEJ-004 · Pantalla de inicio** (`/inicio`, nueva home tras login e índice/catch-all): saludo + unos
  **KPIs** de un vistazo (referencias en el maestro, destinos disponibles y —sólo con `actividad.ver`—
  movimientos registrados) y **tarjetas de acceso rápido** a lo que ese usuario puede usar (filtradas por
  feature). Los KPIs salen de endpoints ya existentes; si alguno falla, muestra «—» en vez de romper.
- Al faltar un permiso, `RequireFeature` ahora cae a `/inicio` (accesible por todos) en vez de a
  `/etiquetas`.

## [2026-07-22] REQ-009 · Editar el «color web» del maestro inline, con permiso por rol

El «color web» sólo se corregía en el Excel origen y reimportando. Ahora se edita **inline** en la tabla
del maestro, si el rol tiene el permiso, y la edición **manda sobre la reimportación**.

### Añadido
- **Feature `maestro.color-web.editar`** en el catálogo cerrado de REQ-006 (permiso por rol). El endpoint
  `PATCH /api/maestro/references/color-web` la exige en el **servidor** (no basta ocultar el input).
- **Editar «color web» inline** en la tabla del maestro (`ColorWebCell`): desplegable con los valores
  existentes (no se crea uno nuevo por un typo; «valor nuevo» es explícito). La edición **propaga a todas
  las tallas del `(ref, color)`** (el color web es del color, no de la talla).
- **La edición gana ante la reimportación**: la fila se marca (`color_name_web_manual`, con quién/cuándo)
  y el `SeedMaster` **ya no la pisa** (regla pura `colorWebParaSeed`, probada aparte). La carga **reporta**
  cuántas filas conservaron su color web editado pese a que el Excel traía otro valor (no miente).
- **Auditado (REQ-007, ya en `main`)**: editar el color web deja su entrada en el **log de actividad**
  (actor · entidad `REFERENCE` · antes→después), escrita en la **misma transacción** que el cambio —
  si falla el registro, no hay cambio.

### Migración
- `reference` + `color_name_web_manual` (bool, default false), `color_name_web_edited_by`,
  `color_name_web_edited_at`. **Aditiva y nullable**: no rompe lecturas ni escrituras existentes.

### Verificado
- **Puerta de calidad en verde**: typecheck + build + **72 tests web (cobertura 98%)** y la suite de API.
- **Romper a propósito**: invertida la regla `colorWebParaSeed`, sus tests se ponen en **rojo** (vigilan
  que la reimportación no pise una edición en silencio). Restaurada, en verde.
- **Pendiente de verificación end-to-end** contra una API/BD levantada: la migración **no** se aplicó al
  Postgres compartido para no molestar al agente que está con REQ-007. Queda como paso al desplegar/probar.

## [2026-07-22] REQ-007 · Fase 1: log de actividad (auditoría) — recorder + Roles/Destinos + consulta
## [2026-07-22] REQ-007 · Fase 2: Usuarios + import de maestro + vista web «Actividad» (completo)

Cierra REQ-007. El log ya cubre todas las mutaciones y tiene su pantalla.

### Añadido
- **Usuarios** enganchados al log (alta, cambio de rol, activar/desactivar, reset de contraseña), dentro de
  la transacción. **El hash de contraseña NUNCA se registra** (regla no negociable): el `before/after` se
  queda con lo visible; un reset se ve por el `summary`. Con test (`users-activity.spec.ts`).
- **Cargas del maestro** (seed e import) → **una** entrada con su resumen (`N altas / N cambios`), no 5.736
  filas.
- **Pantalla «Actividad»** (sidebar, feature `actividad.ver`): tabla filtrable/ordenable (como el resto) con
  fecha, usuario, acción, entidad y resumen; el **diff antes→después** se abre en un modal. El log no se
  puede editar ni borrar.

### Verificado
- E2E con la API: crear un usuario deja su entrada **sin `passwordHash`** (ni rastro de bcrypt en el log).
- **190 tests** de API (incl. la redacción de contraseña), web 68, typecheck + build en verde.

"Quién hizo qué" deja de perderse. Complemento de REQ-006: ahora que los permisos son dato, la actividad
también. Esta fase deja la fundación y engancha las dos primeras entidades; Usuarios, el resumen del import
de maestro y la vista web van en la Fase 2.

### Añadido
- **Tabla `activity_entry`** (append-only: sólo la API escribe, nadie edita/borra) + migración. Feature nueva
  **`actividad.ver`** en el catálogo de REQ-006, **concedida por migración a los roles que ya gestionan roles**
  (para que exista quien vea el log desde el primer momento).
- **`ActivityRecorder`** (puerto + impl Prisma): registra `actor · acción · entidad · antes→después`. Se llama
  desde los casos de uso de escritura y escribe el log **dentro de la misma transacción** que el cambio —
  mejor no hacer el cambio que auditarlo mal.
- **Enganchado en Roles y Destinos** (crear/editar), con el actor del JWT.
- **`GET /api/actividad`** (feature `actividad.ver`): lista paginada, más reciente primero.

### Verificado
- E2E con la API: crear/editar un destino y crear un rol dejan su entrada, con el **actor correcto** y el
  **diff antes→después** (`Log Test` → `Log Test EDITADO`).
- **Test "romper a propósito"** (`activity.spec.ts`): si un usecase deja de registrar, un test cae — garantía
  de que ninguna mutación se escapa sin auditar. 187 tests API, web 68, typecheck + build en verde.

## [2026-07-22] REQ-007 · Log de actividad — diseño (negocio + arquitectura)

Con varios usuarios operando, hoy **no queda rastro de quién tocó qué**. Se diseña un **log de
auditoría append-only** de cada `create`/`update`/`delete` (usuario, entidad, acción y valor
**antes→después**), visible en una vista "Actividad" sólo para admin. Es sólo diseño: **no toca
código todavía**.

### Documentación
- **Diseño de REQ-007** (`diseño/iniciativas/REQ-007-log-actividad/diseño.md`, estado 📐 Diseñado):
  problema, superficie a cubrir (User, Role, Destination y cargas del maestro), y la decisión clave —
  capturar en los **casos de uso** (puerto `ActivityRecorder`), no en un interceptor HTTP, porque es
  el único punto que da el **diff fiable**.
- **Decisiones cerradas:** vista sólo admin · sólo mutaciones de dato (login/logout y generación de
  etiquetas **fuera**) · retención indefinida por ahora · log **transaccional** · el before/after de
  User **nunca** guarda el hash de contraseña.
- **Backlog:** alta de **REQ-007** (📐 Diseñado), **REQ-008** (RRHH, 🆕 aparcado) y **MEJ-003 / MEJ-004**
  (reorganizar navegación y refrescar la pantalla de inicio).
## [2026-07-22] REQ-009 · Editar "color web" del maestro inline — diseño (negocio + arquitectura)

El "color web" del maestro sólo se corrige hoy en el Excel origen y reimportando. Se diseña editarlo
**inline** en la tabla, como **privilegio de rol**. Es sólo diseño: **no toca código todavía**.

### Documentación
- **Diseño de REQ-009** (`diseño/iniciativas/REQ-009-editar-color-web-maestro/diseño.md`, 📐 Diseñado).
  El nudo era el **dueño del dato**: `colorNameWeb` se importa por *upsert* del Excel, así que editarlo
  inline chocaba con la reimportación.
- **Decisiones cerradas:** la edición a mano **gana** — el import la respeta (marca `source='web'`) ·
  editar **propaga a todas las tallas del `(ref, color)`** · el valor se **elige de los existentes** ·
  privilegio **`maestro.color-web.editar`** (feature cerrada de REQ-006, enforce en servidor) · el
  `update` queda **auditado por REQ-007**.
- **Backlog:** alta de **REQ-009** (📐 Diseñado).

## [2026-07-22] REQ-005 · Podar los ficheros de SAP a lo realmente comprado (completo)

Silvia sacaba de Prepedidos los ficheros para SAP (materiales, tarifas 906/073, surtidos) con **todo el
histórico** y los depuraba **a mano**, línea a línea, hasta dejar sólo lo comprado. Ahora sube el borrador +
esos ficheros y **descarga los podados** — mismo formato, sólo con lo comprado.

### Panel web
- Nueva sección **«Podar SAP»** (sidebar, con `maestro.cargar`): subir el borrador de prepedidos (Excel) +
  los ficheros de SAP (.txt), y descargar cada uno podado. El informe dice cuántas referencias quedan, cuántas
  se anulan, y **avisa si algo comprado no aparecía** en un fichero (venía incompleto). `POST /api/poda`.

### La regla de la familia (confirmada por Silvia, 21/07)
La ref de familia que va a SAP se obtiene de la ref color-a-color del borrador **poniendo el 3º dígito a 0 y
añadiendo un 0 al final** (`7613425` → `76034250`). El 3º dígito codifica el color, así que los colores de una
ref caen en la misma familia. **Defensivo:** si una ref no tiene el formato esperado, se avisa — no se inventa.

### Añadido (`src/poda/`)
- **Dominio:** `familiaDeRef` (la regla), `comprasDelBorrador` (lo comprado = líneas con `Suma > 0`) y `podar`
  (deja sólo las filas cuya `(familia, color)` esté comprada; en tarifas, sólo la familia). **Avisa de lo
  comprado que no aparezca en el fichero** (fichero incompleto → nunca se da por bueno en silencio).
- **Lectores:** del borrador (Excel) y de los 4 ficheros de SAP (TSV, cada uno con su columna de `MATNR`/color);
  el serializador **conserva el formato** (mismo salto de línea) porque es un fichero que se sube a SAP.
- **Caso de uso** `podarFicheros`: orquesta borrador + lote de ficheros → podados + informe.

### Verificado (contra los ficheros reales del 2003)
- **Materiales: 138 filas → 14** (los 7 colores × chica/chico que Silvia detalló), **0 comprado que falta**.
- Tarifas y surtidos: podan sólo las familias/colores comprados; 0 faltantes en todos.
- **183 tests** de API (incl. `poda.spec.ts` con la tabla de Silvia y `sap-file-reader.spec.ts`).

## [2026-07-22] REQ-006 · Fase 2: CRUD de roles, panel autoadministrable y front por features

Sobre la fundación de la Fase 1, ya se puede **gobernar todo desde el panel**: crear roles, marcar sus
permisos con checkboxes y activar/desactivarlos. Los usuarios ven y usan sólo lo que su rol permite.

### Añadido
- **CRUD de roles** (`GET/POST/PATCH /api/roles`, feature `roles.gestionar`) con **anti-bloqueo**: la API
  **rechaza** cualquier cambio que dejara al sistema sin ningún rol activo con `roles.gestionar` (nadie
  podría volver a administrar). Con test (`roles.spec.ts`).
- **Pantalla «Roles»** (sidebar, con `roles.gestionar`): tabla + modal con **checkboxes de permisos**
  (catálogo cerrado), crear rol, editar, activar/desactivar. Reutiliza el patrón de Destinos/Usuarios.
- Listar roles lo puede también quien tiene `usuarios.gestionar` (para el desplegable de rol al dar de
  alta), pero **crear/editar** roles sigue pidiendo `roles.gestionar`.

### Cambiado
- **El front decide por FEATURES, no por `isAdmin`**: el sidebar y los guards de ruta usan `hasFeature(…)`;
  las features vienen en el login/`me`. Se acabó el `RequireAdmin` hardcodeado.
- **Usuarios**: el rol ya no es un desplegable fijo `operador/admin` — sale de los roles reales, y cambiar
  el rol de un usuario es un selector con todos los roles activos.

### Verificado (API levantada)
- Crear rol `contable`; **feature inventada → 400** ("no se inventan"); **anti-bloqueo → 400** al quitar
  `roles.gestionar` del único rol que la tiene.
- **Acceso fino**: un rol con sólo `usuarios.gestionar` puede `GET /users` y `GET /roles` (200) pero
  **no** `POST /roles` (403); un operador sin ninguna de las dos → `GET /roles` 403.
- **170 tests** de API (incl. `roles.spec.ts`), web 98%, typecheck + build en verde.

## [2026-07-21] REQ-006 · Fase 1: los permisos pasan de código a dato (roles + features), sin que nadie lo note

Primer tramo de REQ-006 — la **fundación**: "quién puede qué" deja de estar clavado en el código y pasa a
la BD, **con comportamiento idéntico** (operador y admin siguen viendo/pudiendo exactamente lo mismo). El
panel autoadministrable y el front llegan en la Fase 2.

### Añadido
- **Catálogo de features cerrado** en `@yorga/contracts` (`FEATURES`): `etiquetas.ver`, `maestro.ver`,
  `maestro.cargar`, `destinos.gestionar`, `usuarios.gestionar`, `roles.gestionar`. Es la lista que la app
  sabe proteger; se asignan a roles, **no se inventan desde la web**.
- **Rol como dato**: tabla `role` (`key`, `name`, `features[]`, `active`, `system`) + migración que
  **siembra el estado actual** — `admin` = todas las features, `operador` = `etiquetas.ver` + `maestro.ver`.
  Migración escrita a mano para convertir el enum `Role` a texto **sin perder los usuarios**.
- **Guard por feature** (`FeatureGuard` + `@RequireFeature`): sustituye a `@Roles`. Lee las features del rol
  **de la BD por petición**, así un cambio de permisos aplica **sin re-login**. El login/`me` devuelven las
  features efectivas del usuario.

### Cambiado
- `@Roles('admin')` → `@RequireFeature('…')` en usuarios (`usuarios.gestionar`), destinos
  (`destinos.gestionar`) y cargar/importar maestro (`maestro.cargar`). El enum `Role` desaparece; `role` es
  ahora la clave de un rol gobernable.

### Verificado (de verdad, con la API levantada)
- **Nadie nota el cambio**: operador → `403` en Usuarios y Destinos, admin → `200`; ambos `200` en lo común
  (markets). Idéntico a antes.
- **Un cambio de permisos aplica sin re-login**: se añade `destinos.gestionar` al rol operador en la BD y,
  con el **mismo token**, `/destinos` pasa de `403` a `200`.
- **158 tests** de API (incl. `feature-guard.spec.ts`, que fija que el guard bloquea de más — el fallo que
  sería un agujero). Typecheck + build + web 98% en verde.

## [2026-07-21] Skills de tarea · las subtareas pasan a ser opcionales

Feedback de Pablo estrenando `requerimiento-tarea`: **las subtareas no siempre hacen falta**. Las 4 skills
ahora, en el freno, **preguntan** si los próximos pasos (o la disciplina de arreglo, en los bugs) van
**en la descripción** (por defecto, menos ruido en el board) o **como subtareas** (si se van a seguir por
separado). También se registró **REQ-006** (roles y permisos por feature, autoadministrables · 🔍 análisis).

## [2026-07-21] Skills de tarea → familia de 4 (bug/requerimiento × correo/directo)

Las dos skills que vuelcan trabajo a ClickUp se reorganizan en un set claro de **4**, sobre dos ejes:
**tipo** (bug / requerimiento) × **origen** (de un correo / descrito directamente por Pablo).

| skill | tipo | origen |
|---|---|---|
| `requerimiento-correo-tarea` *(antes `correo-a-tareas`)* | requerimiento | correo |
| `bug-correo-tarea` *(antes `create-bug`)* | bug | correo |
| `requerimiento-tarea` *(nueva)* | requerimiento | directo |
| `bug-tarea` *(nueva)* | bug | directo |

- Las dos **«directo»** son gemelas concisas de su hermana «correo»: **delegan** en ella todo el
  procedimiento (clasificar/analizar o capturar, el freno con OK, dedup, subtareas, registro en el
  backlog) y sólo cambian el arranque (no leen Gmail: parten de lo que describe Pablo) y la línea de
  origen (`petición directa de Pablo` en vez de `correo …`). Así no se duplican ~100 líneas por skill.
- Renombres hechos con `git mv` (historial preservado); `.gitignore` actualizado con las 4 excepciones.
  Las entradas de CHANGELOG anteriores conservan los nombres viejos a propósito (eran ciertos entonces).

## [2026-07-21] BUG-005 · Etiquetas: una talla re-referenciada cogía la ref sin EAN y salía "faltante"

Silvia generó etiquetas EAN del pedido 4603335 y las tallas **43 y 45 de GOAL GYS** salieron como
faltantes, aunque el dato está en la BD y el PDF traía la ref correcta. Otra de la familia peligrosa
—esta vez avisó, pero por un pelo—.

- **Causa:** `MasterIndex` indexa por (style, color, talla, género) y lo hacía con `set()`
  **last-write-wins**. GOAL GYS está re-referenciado (ref nueva `8683709` con EAN en todas las tallas +
  ref vieja `8683549` con EAN vacío); para 43/45 conviven ambas y la vacía, al entrar después,
  **pisaba** a la buena → faltante.
- **⚠ Por qué era peligroso:** esta vez la ref mala no tenía EAN (por eso avisó). Si hubiera tenido
  **otro** EAN, el generador habría impreso un **código erróneo en silencio**. El arreglo cierra eso.
- **Arreglo:** ante colisión de clave, el índice se queda con la fila **más completa** (la que trae
  EAN/UPC), **independiente del orden de inserción**. [`master-index.ts`](apps/etiquetas-coolway-api/src/domain/services/master-index.ts).
- **Test:** [`master-index.spec.ts`](apps/etiquetas-coolway-api/test/master-index.spec.ts) — prueba los
  **dos órdenes** de inserción (un test de un solo orden pasaría igual con el bug). Verificado rompiendo
  el código a propósito (vuelve a rojo) y contra la **BD real** (43/45 → `8683709`). 152 tests API en verde.

## [2026-07-21] Skill `create-bug` · de un correo que reporta un fallo, a un BUG bien registrado

Hermano de `correo-a-tareas`, pero produce un **BUG** con la disciplina del proyecto: captura
**síntoma + causa raíz sospechada + cómo reproducir**, se hace la pregunta *"si devolviera un resultado
incompleto, ¿cómo me enteraría?"*, registra `BUG-XXX` en el backlog y, tras el OK, crea el bug en ClickUp
con las subtareas de la regla de oro (test en rojo → arreglar → romper el código a propósito). Registra,
no arregla. Estrenada de verdad: de ella salió **BUG-005** (arreglado en su propia PR). Versionada en el repo.

## [2026-07-21] Skill `correo-a-tareas` · del correo de Silvia al board de ClickUp

Un correo de negocio (Silvia, Tomás…) pasaba a ser trabajo sólo si Pablo lo leía, lo analizaba y lo
apuntaba a mano. Ahora hay un camino con freno: leer el correo → analizarlo con el ritual de siempre →
enseñar lo que se crearía → y **sólo con el OK de Pablo**, volcarlo a ClickUp.

### Añadido
- **Skill `correo-a-tareas`** (`.claude/skills/correo-a-tareas/`, versionada como `pr-coolway`): dado el
  asunto de un correo, lo lee de Gmail (`silvap.javier@gmail.com`), corre el ritual de
  `/nuevo-requerimiento`, y tras el **OK explícito** crea en ClickUp una **tarea madre por REQ + una
  subtarea por cada próximo paso**. La regla que manda: **nada se crea sin ese OK**.
- **REQ-005 registrado** (🔍 En análisis): *Podar los ficheros de SAP a lo realmente comprado*
  (materiales, tarifas 906/073, surtidos). Origen: correo «FUNCIONES» de Silvia (17/07). Diseño en
  [`diseño/iniciativas/REQ-005-podar-ficheros-sap/`](diseño/iniciativas/REQ-005-podar-ficheros-sap/diseño.md).

### Verificado (estreno real de la skill)
- **Gmail** leyó la cuenta correcta y el correo íntegro de Silvia.
- **ClickUp**: creada la madre `REQ-005` + 5 subtareas en la lista *Automatizaciones*, con dedup por tag
  `req-005` (filtrar por ese tag devuelve exactamente la madre → no se duplicará al relanzar).
- **Aprendido y anotado en la skill:** los tags de ClickUp **deben existir antes** en el Space
  (`add_tag_to_task` falla si no) — por eso el dedup se apoya en DOS marcas: el `REQ-005` del título
  (siempre fiable) y el tag (mejor para filtrar, si existe).

### Infra
- **ClickUp conectado** como MCP (`mcp.clickup.com`, scope global) y **Gmail** re-autorizado a la cuenta
  personal de Pablo. Son conexiones de la máquina, no del repo.

## [2026-07-16] REQ-004 · Los destinos se gestionan desde la web (ya no viven en el código)

Abrir un cliente nuevo (un país, una sociedad) o cambiar el "importado por" exigía tocar el repo y
desplegar: Silvia dependía del CTO para un dato que es **suyo**. Ya no.

### Añadido
- **Pantalla «Destinos»** (sidebar, **sólo admin**): la tabla, con los mismos filtros y orden que el
  resto, y una columna de **acciones**. El formulario vive **en un modal**, detrás del botón «Nuevo
  destino» o de «editar» en cada fila — el mismo para las dos cosas. Si la API rechaza el guardado, el
  modal **se queda abierto con lo escrito** y dice por qué: cerrarlo obligaría a teclearlo todo otra vez.
- **Tabla `destination`** en Postgres (migración `20260716094817_destinos`), **sembrada con los 6
  destinos actuales** exactamente como estaban en `markets.ts`. Nadie nota el cambio.
- `GET /api/destinos` · `POST /api/destinos` · `PATCH /api/destinos/:id` (rol `admin`).

### Cambiado
- `GET /api/markets` (el desplegable al generar) sale ahora de la BD y **sólo ofrece los ACTIVOS**.
  Trae además un **nombre legible** ("Valencia / tiendas" en vez de `VALENCIA`).
- **La CLI y la web comparten la misma fuente de verdad**: `resolveMarket()` y la constante `MARKETS`
  desaparecen del código.

### Una variante es, simplemente, QUÉ CÓDIGOS lleva la etiqueta
Los códigos se eligen con **checkboxes** (`CODE128` · `UPC` · `EAN`), no de una lista cerrada de 4.

Las «4 variantes» de siempre no eran un límite del motor: `buildLabels` ya decidía **código a código**
si tocaba imprimirlo, y el Excel de salida ya montaba sus columnas según los que trajera cada fila. Eran
4 de las 7 combinaciones posibles, las que hicieron falta en su día. **CODE128 a solas no se podía pedir
por el nombre, no por el motor** (se compone de ref+talla: ni siquiera necesita el maestro).

- El **nombre de la variante se deriva** de los códigos marcados, en orden canónico `CODE128 → UPC → EAN`.
  Esa regla **reproduce exactamente** los nombres de siempre, así que el nombre del fichero
  (`etiquetas_4603662_UPC_EAN.xlsx`) y la celda «Variante» del resumen **no cambian** — y los consume
  otro proceso. Hay test que fija la regla y el ida y vuelta.
- El orden en que se marquen los checkboxes **no** cambia el nombre: mismo destino, mismo fichero.
- **Al menos un código**: una etiqueta sin ningún código no es una etiqueta. La API sigue rechazando
  cualquier nombre que no sea una de las 7 (es pública: la pantalla no es la única puerta).

### Los destinos se desactivan, no se borran
Si no, los pedidos antiguos dejarían de tener sentido. Y un destino desactivado **no genera**: se dice
claro, en vez de sacar etiquetas de un destino retirado.

### Verificado
- **Los 6 destinos generan igual que antes**: pedido real `4603662` por los seis, `448 filas / 11.028
  pares`, **cuadre OK** en todos, con la misma variante, el mismo "importado por" y el **mismo nombre de
  fichero** que con la constante vieja.
- **CODE128 a solas, probado de punta a punta**: destino nuevo por API → 11.028 pares, cuadre OK, con la
  columna `code128` y sin `ean13`/`upc` (`76835530000036` = ref + `00000` + talla, RN-02).
- El test del destino desactivado se **rompió a propósito** (se anuló el corte) y se puso **rojo**.
- `npm run typecheck && npm test && npm run build` en verde. **151 tests** de API; coverage API 90%, web 98%.

### Arreglado de paso
- El selector de destino fijaba `'VALENCIA'` a pelo: al poder desactivarse, se habría quedado apuntando
  a un destino inexistente y el pedido fallaría al generar, sin que la pantalla mostrara nada raro.
  Ahora toma el primero que llega de la API. La etiqueta «Destino» tampoco estaba asociada al `<select>`.

## [2026-07-16] BUG-004 · Corregir una talla en el Excel NO surtía efecto (quedaba la fila vieja, y ganaba)

Silvia corrigió el `SIZE` de la mochila (`35` → `U`), recargó el maestro… **y la etiqueta seguía
imprimiendo "35"**. Habría dado el problema por resuelto sin estarlo. Otra de la familia: no falla, miente.

- **Causa:** la identidad de una fila es `(ref, talla)`. Al cambiar la talla, la corregida es una fila
  **nueva** y la vieja se quedaba (el seed no borraba nada, por diseño). Y como **ambas comparten la talla
  SAP `C01`**, al generar había dos candidatas y **ganaba la vieja**.
- **Arreglo:** al cargar el maestro se **retiran las filas huérfanas** — las que están en la BD, ya no en el
  Excel, **y cuyo producto (modelo+color) sí viene en él** — y **se reportan en el informe** (borrar en
  silencio sería inaceptable). Se ve en la web, en su propio cuadro.
- **Por qué acotado al mismo producto, y no "borrar todo lo que no venga":** un Excel incompleto sería una
  catástrofe. Ya pasó: la hoja `GOAL` no se leía por una cabecera rota, y sus **1.343 filas** habrían
  desaparecido. Si un producto no viene, no se toca. Hay test que lo fija.
- **Verificado con el Excel real de Silvia** (`16-07-2026/REFERENCIAS COOLWAY_16_07_3.xlsx`): retira 1 fila
  (`BACKPACK BLK · 308280 · talla 35`), el maestro vuelve a 5.736, y **4602991 (Valencia) sale 750/750 con
  la talla `U` impresa** y `CODE128 03082800000035`.

## [2026-07-15] BACKPACK vuelve a etiquetarse (Silvia: los pedidos 4602991/4602992 sí van)

Estuvo excluido ("no se vende"), pero Silvia confirma que esos dos pedidos de mochila **sí** se
etiquetan. Se revierte la exclusión.

### Cambiado
- **`MODELOS_EXCLUIDOS` queda vacío**: BACKPACK sale de la lista y se etiqueta como cualquier modelo. El
  mecanismo de exclusión se mantiene (con test) por si vuelve a hacer falta.
- Verificado: **4602991 (Valencia, code128+ean) → 750/750, 0 faltantes**, con `CODE128 = 03082800000035`
  (la ref `308280` de 6 dígitos lleva el cero delante: `0308280`, regla RN-02 de REQ-003).

### ⚠ Pendiente de Silvia (defectos del maestro, no de código)
Para que BACKPACK salga **perfecto**, hay que corregir su fila en `REFERENCIAS COOLWAY.xlsx`:
1. **`SIZE` debe ser `U`, no `35`.** Hoy imprime `35` (se coló la talla-tiendas en la columna que se
   imprime). El `35` es correcto en el código de barras, pero la etiqueta debe decir `U`.
2. **Falta el UPC.** El pedido **4602992 va a USA** (UPC+EAN) y BACKPACK no tiene UPC → sale como faltante.
   El de Valencia (4602991) no lo necesita.

## [2026-07-15] BUG · Cargar el maestro daba 504 en producción (seed demasiado lento)

- **Síntoma:** en producción, *"Error al cargar el maestro"*. La API respondía **504 a los ~14 s** (el
  gateway de App Platform corta ahí).
- **Causa:** el seed hacía **5.769 upserts SECUENCIALES**. En local (BD a 0,1 ms) volaba; contra la Managed
  Postgres (por red) tardaba >80 s → timeout. No era memoria ni el código: era el ir y venir fila a fila.
- **Arreglo:** las filas **nuevas se crean en LOTE** (`createMany`) y las **existentes se actualizan con
  concurrencia** limitada. Antes de procesar se **deduplica por (ref, talla)** quedándose con la última
  (como el upsert secuencial), para que el resultado sea idéntico y determinista.
- **Verificado en local:** carga completa (5.736 filas) en **~2 s** (antes >80 s), mismos datos exactos
  (GOAL con UPC, las tres tallas de REQ-003), y la recarga (todo updates) también en ~2 s.

## [2026-07-14] Despliegue · DigitalOcean App Platform + Managed Postgres

La herramienta corría sólo en local. Se prepara para desplegarla en **App Platform** (PaaS de DO):
front + API bajo el mismo dominio, y el maestro en **Managed Postgres** (con backups: es la fuente de
verdad, no puede depender de backups manuales).

### Añadido
- **`Dockerfile`** de la API — su razón de ser es `pdftotext`: dependencia del **sistema operativo** que
  `npm ci` no instala. La imagen la trae con `poppler-utils` (+ `openssl`, que el motor de Prisma necesita).
- **`.do/app.yaml`** — el app spec: static site (web) en `/`, servicio (api) en `/api` con
  `preserve_path_prefix` (Nest usa el prefijo global `/api`), Managed Postgres, y las migraciones que
  corren solas al arrancar (`migrate deploy`, idempotente).
- **`docs/despliegue.md`** — paso a paso reproducible (crear la app, el secreto, el primer admin, cargar
  el maestro, comprobar que vive).
- **`.dockerignore`** — fuera de la imagen `node_modules`, `dist`, `docs`, y **el `.env`** (llevaba el
  secreto de dev y pisaba la config de producción).

### Corregido (seguridad) — `JWT_SECRET` obligatorio en producción
- Hasta ahora, sin `JWT_SECRET` la API arrancaba con un secreto de desarrollo **en el código**: desplegada
  así, **cualquiera podría firmarse un token de admin**. Ahora, con `NODE_ENV=production` y sin secreto, la
  app **no arranca** (cae al iniciar, con mensaje claro). Fuera de producción, sigue el secreto de dev.

### Verificado construyendo y arrancando la imagen de verdad
- `pdftotext` está en la imagen · el `.env` local no se cuela · login OK con el secreto de producción ·
  **genera etiquetas** (pedido 4603418: 7 filas, 60 pares, cuadra) · y en producción **sin `JWT_SECRET` se
  niega a arrancar**, como debe.
- Lo que NO se puede hacer desde aquí (requiere la cuenta de DO): crear la app, provisionar la base de datos
  y lanzar el deploy. Queda todo listo y documentado; lo ejecuta el usuario desde el panel o con `doctl`.

## [2026-07-14] REQ-003 ✅ · Etiquetar ropa, calcetines y bolsas: el SKU tiene TRES tallas

Hasta hoy la herramienta sólo sabía etiquetar **calzado**, donde la talla es la misma en todas partes: el
PDF dice `40`, el código de barras lleva `40` y la etiqueta imprime `40`. En **ropa, calcetines y bolsas
NO se cumple**, y confundirlas imprime **el código de barras de otro producto** — en tienda se cobraría lo
que no es. Estas familias se hacían **a mano**.

| Familia | Talla SAP (viene en el PDF) | Talla tiendas (va al código) | Size (se imprime) |
|---|---|---|---|
| Calzado | 40 | 40 | 40 |
| Ropa | 31 | 11 | S, M, L, XL |
| Calcetines | 31 | 11 | 36-38, 39-41… |
| Bolsas / gorras | C01 | 35 | U |

**El puente `31 → 11` es el mismo en ropa y calcetines, pero la talla impresa cambia** (`S` vs `36-38`). Por
eso la traducción **no se calcula con una tabla en el código: se LEE del maestro, fila a fila** — que es la
regla de oro del proyecto.

### Añadido
- **Migración `tallas_sap_y_tiendas`**: `reference` guarda ahora `talla_sap` y `talla_tiendas` además de
  `size`. En calzado van vacías (las tres coinciden), así que **no hay excepciones ni `if` especiales**.
- **La búsqueda se hace por la talla SAP** (`MasterIndex`), que es la que trae el PDF. Antes, la ropa no se
  habría encontrado nunca: el PDF dice `31` y el maestro guarda `S`.
- **El CODE128 lleva la talla TIENDAS**, no la que se imprime. Meter la impresa daría `...0000S`: un código
  inválido, una etiqueta inservible.
- **RN-02 ampliada — la ref se rellena con ceros hasta 7 dígitos** (regla de Silvia: *"las referencias que
  tengan un dígito menos deben añadir un cero delante"*). La mochila `308280` → `0308280`. Lo confirma el
  propio SAP: en el PDF su ref viene ya como `03082800000C01`.
- **Surtido `C01`** (bolsas/gorras): 1 unidad de talla única. Validado con 4602991 (750 cajas = 750 pares).
- **`BACKPACK` excluido** por decisión de negocio (no se vende): no se etiqueta, **pero se REPORTA** en cada
  pedido como *"modelo excluido"*. Nunca desaparece en silencio.
- **La hoja `ROPA` se lee por CONTENIDO** (excepción documentada): sus rótulos están mal —la columna
  `TALLA TIENDAS` está vacía y el `11` vive bajo `SIZE`—, aunque los datos son correctos. De las dos
  columnas `SIZE`, la que trae letras es la que se imprime; la numérica es la de tiendas; la de en medio,
  sin rótulo, es la SAP. **Se avisa en cada carga**, y el día que se normalice, el parche se desactiva solo.

### Corregido · un modelo excluido ya NO sale como "descuadre"
- Al generar un pedido de **BACKPACK** (excluido), la pantalla decía *"No cuadra: faltan 750"* en rojo y
  *"1 código sin resolver — hay que completar el maestro"*. Todo falso: no es un código que falte, es un
  modelo que **a propósito** no se etiqueta. Mandaba a Silvia a buscar unos códigos que no existen.
- Ahora el cuadre **cuenta los pares excluidos como explicados** (`excludedPairs`): el pedido cuadra, el
  KPI de faltantes no los cuenta, el badge sale en gris ("1 excluido") y el aviso es informativo, no de
  error. Lo que sí falta de verdad sigue en rojo (hay test que lo separa).

### Añadido · cuadro de conversión de tallas (botón "Ver conversión de tallas")
- En ropa/calcetines/bolsas, un panel aparte muestra la conversión completa —**talla del PDF → se imprime →
  talla del código → CODE128**— para poder validar de un vistazo que cada código de barras es el que toca.
- **La tabla de etiquetas NO se toca**: sus columnas son la entrada de otro proceso. El cuadro es
  informativo y sólo aparece cuando hay conversión (en calzado las tres tallas coinciden).

### Verificado con los 6 pedidos reales de Silvia (`validaciones/14-07-2026/`)
| Pedido | Familia | Códigos | Resultado |
|---|---|---|---|
| ORDER 4603015 | Ropa | CODE128+EAN | **1.280/1.280 pares · 0 faltantes** |
| ORDER 4603016 | Ropa (los mismos) | UPC+EAN | **1.220/1.220 · 0 faltantes** |
| 4603670 | Calcetines + ropa | CODE128+EAN | **1.000/1.000 · 0 faltantes** |
| 4603671 | Ropa | CODE128+EAN | **200/200 · 0 faltantes** |
| 4602991 / 4602992 | Mochila | — | excluidos y **reportados** |

Ejemplo real de la salida: `ICONIC BLK` imprime **`S`** y su CODE128 es **`90087670000011`**; `ZEBRA FRS`
imprime **`36-38`** y su CODE128 es **`93882260000011`**.

**Sin regresión en calzado**: 4603418 (60/60), 4603662 (11.028), 4603661 (5.080), 4603187 (8.444).

## [2026-07-13] BUG-003 · Los UPC de GOAL estaban en el Excel y no se cargaban · y MEJ-002 (surtidos nuevos)

Salió al probar el pedido **4603661**, que no se podía etiquetar. Detrás había dos cosas.

### Corregido · BUG-003 — el lector del maestro cogía la columna UPC equivocada
- **Síntoma:** el pedido 4603661 (USA) daba **119 faltantes por "falta el UPC"**… pero los UPC **estaban en
  el Excel**. La app decía que faltaba un dato que sí existía: **no fallaba, mentía.**
- **Causa:** la hoja `GOAL` tiene **dos columnas con la cabecera `UPC`**: la **H** (los códigos buenos, 985)
  y la **N** (de la subtabla `GOAL HI`, 28 valores). El lector mapeaba las cabeceras en orden y **la última
  pisaba a la primera** → se quedaba con la N. El número lo confirmaba: en la BD había exactamente
  **28 GOAL con UPC**, los 28 de la columna equivocada.
- **Arreglo:** ante un `UPC` repetido se usa **siempre la PRIMERA columna** (regla confirmada por Silvia: la
  segunda pertenece a la subtabla `GOAL HI` y no es válida). No se pudo aplicar "la primera" a todo: la hoja
  `ROPA` repite `SIZE` y ahí la buena es **la última** (`S/M/L/XL` frente a un código interno `11,12,13`).
  Para el resto de cabeceras repetidas se usa la que tiene datos, **avisando por el log**: una cabecera
  duplicada es un defecto del Excel y hay que verlo, no taparlo.
- **Resultado:** GOAL pasa de **28 a 948** UPC · el maestro de 2.679 a **3.599** · el pedido **4603661 pasa
  de 119 faltantes a 0**, y el **4603662 de 46 a 0** (era el mismo bug).

### Añadido · MEJ-002 — tres surtidos nuevos (D, CD, DE4)
El pedido 4603661 usaba surtidos que el catálogo no conocía, y el dominio **paró antes que inventar** cuántos
pares lleva cada caja (que es lo correcto: inventarlo habría descuadrado el pedido en silencio).

| Código | Género | Composición | Pares/caja |
|---|---|---|---|
| `D` | Chica (76) | 36×1, 37×1, 38×1, 39×1 | 4 |
| `CD` | Chico (86) | 40×1, 41×1, 42×1, 43×1 | 4 |
| `DE4` | Chica (76) | 37×1, **38×2**, 39×1 | 4 |

`DE4` **dobla la 38** en vez de repartir una por talla: suponerlo "uniforme" habría cuadrado igual pero con
**la talla equivocada** en 95 cajas.

**Cómo se obtuvo la composición (sin inventar nada):** leyendo la rejilla del PDF con las **coordenadas
exactas** de cada número (`pdftotext -bbox`), no a ojo — el primer intento a ojo daba 7 pares donde el PDF
declaraba 6 y se descartó. La lectura **se valida sola**: de los 12 surtidos del pedido, los **9 que ya
estaban en el catálogo coincidieron exactamente**. Y el pie del PDF declara **1.068 cajas / 5.080 pares**:
con las tres composiciones nuevas sale **1.068 / 5.080** exactos.

### Diseño
- **REQ-003** registrado (🔍 en análisis): etiquetar **ropa, calcetines y bolsas**, donde el SKU tiene
  **tres tallas** (la del PDF, la del código de barras y la que se imprime). Bloqueado a la espera de un PDF
  de pedido real de esas familias y de confirmar la regla del CODE128 para refs cortas.

## [2026-07-13] MEJ-001 · UX de Base de datos · y BUG-001 / BUG-002 (filtros)

### Añadido (MEJ-001)
- **KPIs fijos (sticky)**: explorando 5.736 referencias se perdía de vista el total, que es justo la
  referencia para interpretar lo que estás viendo. Se quedan arriba, más compactos y con fondo opaco.
- **Pestañas** en Base de datos: **Referencias** (explorar, filtrar, exportar — lo del día a día, y lo
  primero que se ve) y **Cargas y actualizaciones** (subir maestro + códigos), **sólo visible para admin**.
  Antes, un operador veía primero dos formularios que ni siquiera puede usar.
- **La barra de Referencias, en una sola fila**: título · buscador · exportar. El buscador **crece** para
  ocupar el hueco libre (antes tenía un ancho fijo pequeño y el botón se le caía debajo).

### Corregido · BUG-001 — un filtro con >20 valores dejaba la tabla vacía SIN ERROR
- **Síntoma:** al desmarcar un valor en `color web`, la tabla salía vacía.
- **Causa:** Express parsea la query con `qs`, cuyo **`arrayLimit` es 20**: a partir de 21 valores repetidos
  deja de construir un array y devuelve un **objeto** `{0:…, 1:…}`. El parser lo convertía en la cadena
  `"[object Object]"`, que no coincide con nada → **0 filas y ningún error**. Sólo se veía en `color web`
  porque tiene **408 valores distintos**: al desmarcar uno se mandaban 407. Umbral confirmado contra la API:
  **20 valores → 21 filas** (correcto), **21 → 0**.
- **Arreglo:** `arrayLimit` alto en `main.ts` **y** el parser acepta también la forma de objeto — dos capas,
  para que un cambio de configuración no lo vuelva a romper en silencio.
- **Verificado:** desmarcando `(vacío)` → **4.843 filas**, exactamente 5.736 − 893 (contrastado en Postgres).

### Corregido · BUG-002 — el desplegable del filtro se vaciaba al desmarcar
- **Síntoma:** desmarcabas un valor y la lista quedaba vacía; había que cerrar el popover y reabrirlo.
- **Causa:** al cambiar un filtro se invalidaba la caché de facetas **entera**, incluida la de la columna que
  se estaba editando — y las facetas del maestro sólo se piden **al abrir** el desplegable.
- **Arreglo:** se **conservan** las facetas de esa columna (se calculan ignorando su propio filtro,
  que es justo lo que te permite volver a marcar lo que acabas de desmarcar) y sólo caducan las de las demás.

### Proceso
- **Se separan REQ / MEJ / BUG** en el backlog y en `CLAUDE.md`: no todo lo que entra es un requerimiento, y
  cada tipo se gestiona distinto. Un bug exige **síntoma + causa raíz + test de regresión**, y el test
  **debe poder fallar**: se rompe el código a propósito y se comprueba que se pone en rojo (hecho con los dos).

## [2026-07-13] REQ-002 · Exportar la vista filtrada del maestro a Excel (fase 4) — REQ-002 COMPLETO

Cierra REQ-002. Cuando Silvia puede filtrar, lo siguiente que quiere es **llevarse eso a Excel**.

### Añadido
- **`GET /api/maestro/export`**: genera el Excel de **la vista filtrada** (los mismos filtros y el mismo
  orden que hay en pantalla). Se genera **en el servidor**, no en el navegador: puede ser el maestro entero
  (5.736 filas), y traérselas al front sólo para volcarlas a un fichero es tirar datos por la red.
- **Botón "Exportar … a Excel"** en Base de datos. El texto cambia solo: *"Exportar todo"* si no hay filtros,
  *"Exportar lo filtrado"* si los hay — que nadie se lleve un fichero creyendo que trae más de lo que trae.
- El fichero sale con el **autofiltro de Excel ya puesto** y la cabecera congelada. El nombre distingue el
  caso: `maestro-coolway-2026-07-13.xlsx` vs `maestro-coolway-filtrado-2026-07-13.xlsx`.
- **Tope de 50.000 filas** por exportación: si se supera, **avisa con un 400**. No se recorta en silencio —
  un Excel a medias es peor que ninguno.

### Corregido (un bug que sólo cazó el test porque REABRE el fichero)
- **Los códigos se escriben como TEXTO, celda a celda.** Estaban marcados con el `numFmt` **de columna**…
  y `exceljs` **no guarda ese formato en el fichero**. Al abrir el Excel, un EAN13 volvería a ser un número:
  saldría en **notación científica** (`8,43385E+12`) y los ceros a la izquierda se perderían. Exportar
  corrompiendo el dato es peor que no exportar. Un test que sólo mirase el objeto en memoria habría pasado
  en verde y Silvia habría recibido un fichero con los códigos rotos.

### Verificado abriendo los ficheros generados
- Exportación completa: **5.736 filas** (Postgres: 5.736). Filtrada por GOAL/talla 42: **167** (Postgres: 167).
- La exportación reusa `toApiFilters`, **el mismo traductor que usa la tabla** para pedir los datos: así el
  Excel y la pantalla no pueden divergir.

## [2026-07-13] REQ-002 · El maestro filtra y ordena EN LA BD (fases 2 y 3)

La tabla del maestro se quedó sin filtros en la fase 1 **a propósito**: es la única paginada en servidor
(100 filas de 5.736), y filtrarla en el navegador habría dado un resultado **falso con apariencia de
correcto** — el mismo patrón que costó los 798 pares del pedido 4603662. Ahora el filtro viaja a Postgres.

### Añadido
- **`GET /api/maestro/references` con filtros por columna**: multivalor (`style`, `color`, `size`,
  `colorNameWeb`), "contiene" (`ref`, `sku`, `ean13`, `upc`) y `sort` + `dir`. Devuelve además
  `grandTotal` (las filas del maestro sin filtrar) para poder enseñar siempre **"N de M"**.
- **`GET /api/maestro/facets?column=…`**: los valores del desplegable de una columna **con los filtros de
  las demás ya aplicados** (como Excel). No se pueden deducir de la página: con 100 filas en pantalla no se
  sabe qué colores tiene GOAL.
- **`useServerTable`**: produce el mismo `TableModel` que `useMemoryTable`, así que **la `DataTable` y la
  página no cambian**. Era la promesa del diseño y se ha cumplido: sólo se cambió el motor.
- **El filtro `(vacío)`** responde a la pregunta real de Silvia (*"¿qué no puedo etiquetar?"*): 893 filas sin
  color web, verificado contra un `count` directo en Postgres.

### Seguridad
- **Lista blanca de columnas para ordenar**: `sort=id;DROP TABLE reference` **no rompe nada**, cae al orden
  por defecto. Pasar el `orderBy` del cliente tal cual habría sido inyectable.
- **Lista blanca de columnas agrupables**: `facets?column=sku` devuelve **400** con mensaje claro, en vez de
  agrupar por una columna de 5.736 valores distintos.

### Corregido
- **Accesibilidad**: los botones de paginación no tenían etiqueta (un lector de pantalla no sabía decir qué
  hacían). Añadidas `aria-label` ("Página siguiente", "Página 3"…).

### Verificado contra la BD real (no sólo con tests)
- `style=GOAL` → **1.343 de 5.736**. Facetas de color con GOAL aplicado → **92**, frente a 95 en todo el
  maestro (los 3 que faltan no existen en GOAL).
- **La selección vacía devuelve 0 filas, no "todas"**: viaja por la URL como `style=`. Si se perdiera ese
  matiz, el servidor devolvería el maestro entero — el mismo bug que ya tuvimos en el front.

> La puerta de calidad hizo su trabajo: al terminar la fase 3, `npm test` **falló** por cobertura de
> funciones (74,35%). Hubo que escribir 4 tests más antes de poder seguir. **120 tests** (70 API + 50 web).

## [2026-07-13] Calidad — tests del front y cobertura mínima del 75% en la puerta

Los dos bugs de la fase 1 (el sticky roto y el "(Seleccionar todo)" que no desmarcaba) los cazó **Pablo a
mano, no un test**. El front no tenía tests y el motor de la tabla ya no es trivial. Se cierra el hueco.

### Añadido
- **Vitest en la web** (+ `@testing-library/react`, jsdom), enganchado a `npm test`. **33 tests**: motor de
  la tabla (facetas cruzadas, selección vacía, orden numérico, paginación), el componente `DataTable` con
  clics reales, y el dominio + casos de uso del front.
- **Tests de `SeedMasterUseCase`** (9): estaba **al 0%** — ahí vive `findSharedEan13`, la lógica de EAN
  compartidos que se shippeó el día anterior **sin un solo test**. Cubre la distinción clave:
  re-referenciación (legítima, no avisa) vs mismo EAN en productos distintos (avisa).
- **Umbral de cobertura del 75%** enganchado a `npm test` (Jest y Vitest): si baja, los tests **fallan**.
  No es decoración — se comprobó subiendo el listón al 99% y viendo a Jest rechazarlo.

### Cambiado
- **La cobertura se mide sobre la LÓGICA**, no sobre el pegamento: quedan fuera controladores HTTP, adapters
  de Prisma/Excel, páginas React y cableado de dependencias. Medido todo junto salía 34% (API) y 5,7% (web),
  un número que no dice nada y que habría acabado con el umbral desactivado. Con el alcance correcto:
  **API 82,5%** (52 tests) y **front 94,7%** (33 tests).
- **Skill `/pr-coolway`**: ahora exige que **todo cambio de código traiga tests** (paso 3) y que la cobertura
  no baje del 75% (paso 4), con la regla explícita de **no bajar el umbral para que pase**.

> ⚠️ Lo que la cobertura **no** cubre, y conviene no olvidar: los fallos de **presentación** (un sticky roto,
> un checkbox que no desmarca) no los caza un porcentaje. Eso se caza **probando la app**.

## [2026-07-13] REQ-002 · Tablas explorables: filtrar por columna y ordenar (fase 1)

Silvia viene de Excel, donde ordenar y filtrar es un reflejo. En la app las tablas eran de sólo lectura,
así que para responder a *"¿qué referencias de GOAL no tienen UPC?"* tocaba mirar a ojo o volver al Excel
— el trabajo manual que estamos eliminando. **Fase 1: todas las tablas que caben en memoria.**

### Añadido
- **Componente único `DataTable`** ([`ui/components/table/`](apps/etiquetas-coolway-web/src/ui/components/table/)),
  usado ya en **etiquetas, faltantes, avisos de carga y usuarios**. Cabecera clicable para ordenar
  (asc → desc → sin orden) y **autofiltro por columna**.
- **El filtro se adapta a la columna según su cardinalidad**: casillas tipo Excel (con recuento) donde hay
  pocos valores distintos; "contiene" donde son casi únicos (sku, ean13, upc) — un desplegable con 5.736
  casillas no lo usa nadie. No hay que configurarlo columna a columna: se decide solo.
- **Facetas cruzadas, como Excel**: los valores que ofrece el desplegable de una columna **respetan los
  filtros ya aplicados en las demás** (si filtras modelo = GOAL, el color sólo ofrece los de GOAL).
- **Contador "N de M filas"** siempre visible + "Quitar N filtros". Es la salvaguarda contra confundir
  *lo que veo* con *lo que hay* — el mismo error que costó los 798 pares del pedido 4603662.
- En la tabla de etiquetas, **Copiar y CSV exportan la vista filtrada**, no el listado entero.

### Corregido
- **El header sticky de las tablas no funcionaba.** El CSS estaba, pero el `responsive` de react-bootstrap
  envuelve la tabla en un `div` con su propio `overflow`: el sticky se anclaba a ese wrapper, que no hace
  scroll vertical, y no se pegaba a nada. Arreglado para **todas** las tablas.
- **"(Seleccionar todo)" no se podía desmarcar**: una selección vacía se interpretaba como "sin filtro" y
  reaparecían todas las filas. Ahora vaciar la selección **es un filtro** (0 filas), que es lo que permite
  el gesto de Excel: desmarcar todo y marcar sólo lo que interesa. Con selección parcial, la casilla sale
  en estado **indeterminado**.

### Arquitectura
- La `DataTable` es **tonta**: recibe un `TableModel` y no sabe de dónde salen los datos. Hoy lo produce
  `useMemoryTable`; en la fase 3 lo producirá `useServerTable` para el maestro (5.736 SKU, paginado en BD)
  **sin tocar la UI ni las páginas**.
- **El maestro se queda sin filtros a propósito hasta la fase 3**: filtrarlo en cliente sólo miraría las 100
  filas de la página y daría un resultado **falso con apariencia de correcto**.

### Diseño
- [`diseño/iniciativas/REQ-002-tablas-filtro-orden/`](diseño/iniciativas/REQ-002-tablas-filtro-orden/diseño.md)
  y REQ-002 en el backlog.

## [2026-07-13] Maestro y lectura del PDF — un bug que imprimía etiquetas de menos

Al cargar el maestro nuevo (`REFERENCIAS COOLWAY_13_07_2026_2.xlsx`) y probar el pedido 4603662
salieron a la luz tres problemas, uno de ellos **grave y silencioso**.

### Corregido
- **🚨 El parser se comía líneas enteras del pedido, sin avisar.** Reconocía el código de color con
  `/^[A-Z]{2,4}$/` (sólo letras), así que los colores **compuestos** (`W-B` blanco-negro, `B-W`, `W-R`)
  no encajaban: no detectaba la cabecera del ítem y **descartaba la línea completa**. En el pedido 4603662
  eran **37 refs · 133 cajas · 798 pares** que nunca se habrían etiquetado. Y el cuadre decía "OK".
- **El cuadre era CIRCULAR y no podía detectarlo**: comparaba las etiquetas contra el pedido leído, pero
  ambos lados salen del mismo catálogo de surtidos. Ahora se contrasta también contra el **total que el
  propio PDF declara al pie** (`TOTAL BOXES` / `TOTAL PAIRS`) — la única fuente independiente. Si no
  coincide, la web avisa en rojo: *"El PDF no se ha leído entero: faltan N pares"*. Verificado contra los
  4 pedidos de muestra (60, 1.840, 8.444 y 11.028 pares): todos coinciden con lo declarado.
- **`POST /api/labels/generate` ya no devuelve un 500 genérico** ante un surtido desconocido: responde
  **422** diciendo cuál es (*"El pedido usa el surtido M36, que no está en el catálogo"*).

### Añadido
- **Surtido `M<nn>`** (caja monotalla: 6 pares, todos de la misma talla), junto al `S<nn>` que ya existía.
  Confirmado contra el propio PDF: 1.838 cajas × 6 = 11.028 pares, el total que declara.
- **Migración `ean13_deja_de_ser_unico`**: el EAN13 deja de tener restricción de unicidad. Un producto
  **re-referenciado** en SAP conserva su código en la ref vieja y en la nueva (mismo modelo+color, dos
  refs): era legítimo y la BD lo rechazaba. La identidad del SKU sigue siendo `(ref, talla)`.
  Desbloquea **47 SKU** (maestro: 5.689 → **5.736**).
- **El EAN13 repetido ahora AVISA, no rechaza**: `findSharedEan13` distingue la re-referenciación
  (legítima, entra sin ruido) de dos **productos distintos** compartiendo código de barras (entra, pero se
  reporta en cada carga). Hoy son **33 avisos** — ver ESTADO.

### Cambiado
- **Un código vacío en el Excel ya no borra el que hay en la BD.** El upsert omitía los campos vacíos…
  no: los escribía como `NULL`. Cargar el maestro nuevo habría **borrado 76 UPC** (familia 2003), dejando
  esas tallas sin poder etiquetarse para USA. Ahora vacío significa *"no lo sé"*, no *"bórralo"*.

## [2026-07-12] Entorno — se comprueba `pdftotext` antes de fallar, y el error se entiende

Generar etiquetas moría con un **`⚠ Internal server error`** opaco en una máquina sin `pdftotext`.
La dependencia **ya estaba documentada** (README y ESTADO), así que el problema no era de documentación:
era que **nada la hacía cumplir**. `npm run setup` pasaba en verde con una dependencia crítica ausente y
el fallo aparecía mucho después, en runtime, disfrazado.

### Añadido
- **Preflight de dependencias de sistema** ([`scripts/preflight.mjs`](scripts/preflight.mjs)), enganchado a
  `npm run setup` (y suelto con `npm run preflight`): comprueba `pdftotext` y `docker` —las que `npm install`
  **no** trae— y aborta con el comando exacto de instalación. El fallo se ve al minuto 0, no al minuto 40.
- **Aviso al arrancar la API**: si falta `pdftotext`, lo dice por consola en vez de arrancar mudo y
  reventar en la primera generación.
- **Skill `/pr-coolway`** ([`.claude/skills/pr-coolway/`](.claude/skills/pr-coolway/)) y **plantilla de PR**
  ([`.github/pull_request_template.md`](.github/pull_request_template.md)): cerrar un bloque implica rama,
  puerta de calidad, CHANGELOG + ESTADO, y push por `origin` (github-coolway). Es un skill propio del
  proyecto, así que **sí se versiona** (excepción en `.gitignore` frente a los skills de terceros).

### Corregido
- **`POST /api/labels/generate` ya no devuelve un 500 genérico** cuando falta `pdftotext`: responde
  **503** con el motivo real y cómo resolverlo. El front ya pintaba el campo `message`, así que Silvia lee
  el problema en vez de "Internal server error". Coherente con la regla del proyecto: *si falta un dato, se avisa*.
- El extractor distingue **"no existe el binario"** (`ENOENT`) de **un fallo real del PDF**, que antes se
  confundían en el mismo mensaje.

### Pendiente (despliegue)
- `pdftotext` es dependencia **del sistema operativo**: `npm ci` **no** la instala. Al desplegar hay que
  añadirla a la imagen/VM (`apt-get install -y poppler-utils`). No hay Dockerfile ni docs de despliegue todavía.

## [2026-07-12] Maestro — carga completa desde la web + informe de rechazadas

### Añadido
- **`POST /api/maestro/seed`** (sólo admin) y panel **"Cargar maestro completo"** en la web: se sube
  `REFERENCIAS COOLWAY.xlsx` sin necesidad de CLI ni acceso al servidor. Upsert por (ref, talla): idempotente, no borra.
- `SeedMasterUseCase` compartido por CLI y web (una sola lógica de carga).
- **Informe de filas rechazadas**: antes el upsert toleraba fallos pero sólo los contaba, así que se
  perdían filas en silencio. Ahora dice **qué** fila se quedó fuera y **por qué** (modelo, color, ref, talla, motivo).

### Detectado (calidad del maestro)
- El Excel maestro tiene **29 filas con EAN13 duplicado** → esas tallas no entran en la BD y no se pueden
  etiquetar. Ej.: `8433852550355` está en **GOAL EXP 42** y en **GOAL BRW 42**. Explicaba el descuadre de 1 par
  del pedido 4603338 contra BD. **Pendiente**: que Silvia corrija los duplicados. Ver [`ESTADO.md`](ESTADO.md).

### Documentación
- **`CLAUDE.md`** (contexto y reglas del proyecto) y **`ESTADO.md`** (traspaso: dónde vamos, qué probar, qué sigue).

## [2026-07-01] Acceso — login, roles y administración de usuarios

### Añadido
- **Login** con JWT y usuarios en la **misma Postgres** (tabla `app_user`, contraseñas con **bcrypt**). Módulo `auth` hexagonal en la api.
- **Roles**: `operador` (genera etiquetas, consulta el maestro) y `admin` (además **importa al maestro** y **gestiona usuarios**).
- **Guards globales**: toda ruta exige token salvo `POST /api/auth/login` y `GET /api/health`; `POST /api/maestro/import` y `/api/users/*` exigen `admin`.
- **Pantalla de Usuarios** (sólo admin): alta, cambio de rol, activar/desactivar y reset de contraseña. Salvaguardas: un admin no puede desactivarse ni auto-degradarse.
- CLI **`auth:create-user`** para crear el primer admin (no hay registro abierto).
- **`.env.example`** con todas las variables (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `PORT`).

### Añadido (etiquetas)
- El detalle de un fallo indica ahora **cuántos pares afecta** cada código sin resolver y el **motivo** en claro (no está en el maestro / sin EAN13 / sin UPC).

### Decidido
- Identidad **en nuestra BD** (no SSO corporativo, aún por mapear la infra del grupo). Alcance **local/preparación**.
- **Pendiente al desplegar**: definir `JWT_SECRET` en el entorno, HTTPS y valorar cookie `httpOnly` en vez de `localStorage`.

## [2026-06-30] REQ-001 Fase 2 — Maestro en Postgres (Bloques 1 y 2)

### Añadido
- **Postgres** vía Docker (`docker-compose.yml`, host 5544) como **fuente de verdad del maestro**.
- **Prisma**: modelo `Reference` (una fila por `(ref,size)`), unique `ean13`, **CHECK** de formato EAN13/UPC. Migraciones versionadas.
- **Módulo `maestro`** (hexagonal en la api): importador que une **EAN.xlsm + UPC.xlsm** por `(ref,talla)`, calcula **SKU** y hace **upsert** con **informe** (faltantes, formatos inválidos, desajustes) — Bloques 1 y 2.
- CLI **`maestro:import --ean … --upc …`**.

### Validación
- Importados **672 SKU** reales (EAN+UPC completos, 0 incidencias); **re-import idempotente** (0 duplicados). 36 tests verde.

### Decidido
- Stack: **Prisma + Postgres**; el módulo vive dentro de `etiquetas-coolway-api` (se separará si crece).
- El maestro pasa a ser BD (gobernanza nativa: solo la app escribe). Pendiente: publicar Excel/Sheets desde la BD para los departamentos y que etiquetas lea de la BD.

## [2026-06-30] Validación con 3 pedidos reales de Silvia + parser robusto

### Corregido (parser de PDF SAP, gracias a la validación)
- **Pedidos largos:** los nº de línea de 2+ dígitos saltan a otra línea y el ítem empieza por el style → la cabecera se detecta ahora por **color (2-4 may) + cajas**, sin depender del nº de línea (antes se cortaba en el ítem 9).
- **Surtido** se toma del **sufijo de la ref SAP** (`…I`/`…S36`), no de la columna ASS (que viene `00I` en cajas).
- **Falsos positivos:** el nº de pedido (7 díg.) ya no se confunde con una ref SAP (ahora ≥11 díg. + línea con "total"); filas de fecha/moneda ya no se toman como cabecera (style debe ser alfanumérico).

### Añadido / cambiado
- **Catálogo de surtidos** completado con curvas reales de los bultos: E, L, M, N (chica) y R, S, T, Y (chico).
- `importado por` con nombres legales: **VANYOR S.A.U** y **COOLWAY USA LLC**.
- Test de regresión e2e de cajas surtidas (4603187 → 8444 pares de pedido).

### Validación (3 pedidos reales)
- **4603552** (112 pares sueltos UPC+EAN), **4603187** (8444 cajas CODE128+EAN), **4603338** (1840 solo EAN): el total de PEDIDO calculado **cuadra exacto** con lo declarado. La pequeña diferencia en la salida son **códigos faltantes en nuestra copia del maestro** (modelo EDGE, etc.), que el sistema **avisa** — pendiente maestro actualizado del Drive.

## [2026-06-09] Front: UI con Bootstrap + arquitectura hexagonal/DDD

### Añadido
- **react-bootstrap + bootstrap**: UI rediseñada (cards, formulario con ayudas, tabla con badges de cuadre, botones de descarga).
- Nota en el README del front: **qué subir** (maestro `REFERENCIAS COOLWAY.xlsx` vs PDFs de pedido de compra SAP).

### Cambiado
- Front reestructurado a **hexagonal/DDD**: `domain/` (modelo + validación), `application/` (ports + use-cases sin React/fetch), `infrastructure/` (HttpLabelsGateway, BrowserFileDownloader), `ui/` (componentes + hook `useLabels` + composición). El dominio y los casos de uso no conocen React ni HTTP.

## [2026-06-09] Monorepo + API HTTP + Front web

### Añadido
- **Monorepo** con npm workspaces + **Turborepo** (`turbo.json`, `apps/*` + `packages/*`).
- **`packages/contracts`** (`@yorga/contracts`): tipos/contratos compartidos por API y front (`LabelVariant`, `MarketCode`, `MARKETS`, DTOs). Fuente única de verdad de tipos.
- **API HTTP** en `etiquetas-coolway-api` (`interface/http/`): `GET /api/health`, `GET /api/markets`, `POST /api/labels/generate` (**batch**: varios PDFs + maestro → un Excel por pedido en base64). Validada con ficheros reales (2 PDFs, cuadre OK).
- **Front `etiquetas-coolway-web`** (React + Vite): subir PDFs + maestro, elegir destino, ver cuadre/faltantes y descargar los Excel.
- Caso de uso refactorizado a **batch** (lee el maestro una vez) + **serializador** de Excel desacoplado (reutilizado por CLI y HTTP).

### Cambiado
- `apps/etiquetas-coolway` → **`apps/etiquetas-coolway-api`** (git mv, historial preservado).
- Eliminado `pdfjs-dist` (no usado; el PDF se extrae con `pdftotext`).

## [2026-06-09] REQ-001 Coolway — Fase 1 (fichero de etiquetas)

### Añadido
- **App `apps/etiquetas-coolway/`** (NestJS + TypeScript, arquitectura hexagonal): motor que genera el fichero de etiquetas a partir del PDF de pedido de compra SAP + el maestro `REFERENCIAS COOLWAY`.
  - Dominio puro con reglas RN-01..06 (CODE128, surtidos, género 76/86, dedupe por `(ref,talla)`, UPC compartido) + cuadre de pares.
  - Adapters: lector de PDF (parser SAP), lector de Excel maestro, writer de Excel.
  - CLI (`nest-commander`) con preset destino→variante (`--market`) y columna `importado por`.
  - **30 tests** (incl. end-to-end contra ficheros reales 4603418 y 4603434). Reproduce exacto la salida validada por Silvia.
- **Diseño REQ-001** completo en `diseño/iniciativas/REQ-001-coleccion-coolway/`: `diseño.md`, `requerimientos.md`, `acciones.md`, `correo-silvia.md`, `flujo.md` (+ diagramas PNG), `prd/prd-fase1-etiquetas.md`.
- **Fuentes** en `docs/requerimientos/`: correos de Silvia + ficheros reales (PDFs, maestro, bultos, ejemplos).

### Decidido / resuelto
- Stack: **Node + TypeScript + NestJS hexagonal**; tests con Jest.
- **DEP-01..06 y A6 resueltas** con Silvia: maestro del Drive = fuente de verdad; formato de salida **simplificado**; preset por destino (Valencia=CODE128+EAN, USA=UPC+EAN, Australia=UPC, Italia/UK/CR=EAN); columna `importado por`.
- **RF-17:** las etiquetas de **bulto se mantienen en SAP** (fuera de alcance): su barcode embebe codificación SAP y son críticas para la cinta de almacén.

### Pendiente
- Validar variantes UPC-only / EAN-only contra ground-truth (faltan los ficheros de par de 4603332 y 4603335).
- Texto exacto de `importado por` (a confirmar con Silvia).

## [2026-06-08] Estructura inicial

### Añadido
- "Cerebro compartido": `docs/` (info cruda), `diseño/` (negocio + arquitectura + backlog), `apps/` (código).
- Comando `/nuevo-requerimiento` para el ritual de diseño de requerimientos.
- Repositorio git + remoto en `PabloS-coolway/automatizaciones`.
