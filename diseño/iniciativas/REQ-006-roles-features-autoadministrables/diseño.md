# REQ-006 · Roles y permisos por feature, autoadministrables desde el panel

- Estado: 🔍 En análisis · Fecha: 2026-07-21
- Área: Acceso / gobernanza de permisos
- Origen: petición directa de Pablo (21/07).

## Problema de negocio

Hoy hay dos roles (`operador`, `admin`) y **admin ya puede más** que operador (ve Usuarios, Destinos,
carga el maestro). Pero **quién puede qué está clavado en el código**: `@Roles('admin')` repartido por los
controladores y `adminOnly` en el sidebar. Añadir un rol nuevo, o cambiar qué ve un rol, exige **tocar el
repo y desplegar**. No escala: cada matiz de permiso es una tarea de desarrollo.

Se quiere que **roles y permisos sean dato gobernable desde el panel**: crear roles, y decidir con
checkboxes **qué features** tiene cada uno, sin pasar por el CTO ni por un despliegue. Es el mismo salto que
REQ-004 hizo con los destinos: mover una decisión de negocio **del código a la BD, administrada por Silvia**.

> ⚠ **Ojo — lo concreto que se pidió ("Usuarios sólo admin") YA está hecho** (front: `adminOnly` +
> `RequireAdmin`; back: `@Roles('admin')` en `users.controller`). El valor de este REQ **no** es eso: es que
> ese tipo de regla deje de vivir en el código y pase a ser configuración.

## Sistemas afectados (entradas / salidas / dueño del dato)

- **Consume:** el usuario autenticado y su rol (JWT). Hoy el JWT lleva `role` (un string).
- **Produce / gobierna:** un modelo de permisos en Postgres — **la app es su dueña** (self-administrable),
  sembrado a partir del estado actual del código. Sólo la app escribe.
- **Fuente de verdad del acceso:** pasa de **el código** (hoy) a **la BD** (objetivo), leída por el guard de
  la API. El sidebar del front es sólo UX: la puerta real es el guard.

## Encaje arquitectónico

Mismo patrón que REQ-004 (destinos gestionables) y que la disciplina del proyecto: **una decisión de
negocio que estaba en código pasa a ser dato con dueño**. NestJS hexagonal ya tiene el sitio: dominio de
`auth`, guard (`roles.guard.ts`), repos Prisma; y en el front, el patrón de pantallas Usuarios/Destinos.

**Dos límites que NO se negocian** (aprendidos de REQ-004 y de la familia "no falla, miente"):

1. **El catálogo de features es CERRADO y vive en el código.** Una feature es algo que el código sabe
   proteger (`usuarios.gestionar`, `maestro.cargar`…). Se puede asignar/quitar a un rol desde el panel, pero
   **no inventar una feature nueva desde la web**: sería un permiso que no protege nada — o peor, que da
   sensación de seguridad sin darla. (Análogo a "la variante no es texto libre".)
2. **No se puede uno quedar fuera.** Si un admin le quita a su propio rol la feature de gestionar
   roles/usuarios, **nadie podría volver a administrar nunca**. El sistema debe impedirlo: siempre ha de
   quedar al menos un rol activo con la feature de gestión, y el admin bootstrap queda protegido. Un sistema
   de permisos que te deja tapiar la puerta es un fallo grave.
3. **El permiso se enforcea en el SERVIDOR.** Ocultar una tab en el sidebar no es seguridad (la API es
   pública). Cada `@Roles('admin')` de hoy debe convertirse en una comprobación de feature real en el guard.

## Opciones y recomendación

- **Opción A (recomendada): rol como dato + catálogo de features en código + asignaciones rol↔feature en
  BD.** Un usuario tiene **un** rol; el rol tiene un conjunto de features. El guard comprueba *"¿el rol del
  usuario tiene esta feature?"* leyéndolo de la BD (así un cambio de permisos surte efecto sin re-login ni
  despliegue). Se siembran `operador` y `admin` con sus features actuales.
- **Opción B: features por rol pero roles siguen siendo un enum fijo.** Descartada: no deja crear roles
  nuevos, que es medio requerimiento.
- **Opción C: RBAC fino por acción (CRUD) + multi-rol + overrides por usuario.** Sobre-ingeniería para hoy.
  El catálogo por feature/sección (Opción A) cubre lo que hay y escala; si algún día hace falta el grano
  fino, se añade sin re-arquitectura.

Granularidad elegida: **por feature/sección** (Etiquetas, Base de datos, Destinos, Usuarios, Cargar maestro,
Gestionar roles…). Alcance: **sistema completo autoadministrable** (modelo + enforcement + panel + migración
de lo actual).

## Preguntas abiertas y riesgos

- **¿El guard lee las features del JWT o de la BD por request?** Recomendado **BD por request** (fresco, y
  un cambio de permisos aplica al instante). El JWT las cachearía y quedarían obsoletas hasta el siguiente
  login. A confirmar el coste (una consulta pequeña, cacheable).
- **Salvaguarda anti-bloqueo** (punto 2 de arriba): es el riesgo central. Necesita test.
- **Migración sin sorpresas:** operador y admin deben ver/poder EXACTAMENTE lo mismo que hoy tras el cambio.
  Es la red de seguridad (como los 6 destinos de REQ-004).
- **Coherencia front/back:** el sidebar y los guards de ruta deben leer las features reales del usuario, no
  un `isAdmin` hardcodeado — si no, la UI y la API dirían cosas distintas.

## Próximos pasos

**Fase 1 · backend (✅ hecho y verificado, 21/07):**
1. ✅ **Catálogo de features** cerrado en `@yorga/contracts` (`FEATURES`).
2. ✅ **Modelo de datos:** tabla `role` (features como `text[]`, más simple que un join `role_feature`) +
   migración que siembra el estado actual (admin = todas; operador = `etiquetas.ver` + `maestro.ver`),
   convirtiendo el enum a texto sin perder usuarios.
3. ✅ **Enforcement:** `FeatureGuard` + `@RequireFeature` (lee features del rol **de la BD por request** →
   cambios sin re-login); `@Roles('admin')` sustituido en usuarios/destinos/maestro. Con test
   (`feature-guard.spec.ts`). Verificado E2E: operador/admin idénticos a hoy, y cambio de permisos sin
   re-login.

**Fase 2 · CRUD + panel + front (pendiente):**
4. **Salvaguarda anti-bloqueo:** impedir dejar el sistema sin ningún rol activo con `roles.gestionar`, y
   proteger el admin bootstrap. Con test que lo fije. (Va con el CRUD, que es donde se muta.)
5. **CRUD de roles** (API): crear/editar/activar-desactivar roles, con `roles.gestionar`.
6. **Front:** sidebar y guards de ruta leen las **features** del usuario (ya vienen en el login/`me`) en vez
   de `isAdmin`. Un cambio de permisos se refleja sin re-desplegar.
7. **Pantalla de administración de roles** (crear rol, asignar features con checkboxes, activar/desactivar),
   reutilizando `DataTable` + el patrón de Usuarios/Destinos.
8. **Verificar** que operador y admin siguen viendo/pudiendo lo mismo que hoy — red de seguridad (Fase 1 ya
   lo comprobó en la API; falta comprobarlo en la web).

> No se implementa nada hasta que Pablo valide este diseño. La salvaguarda anti-bloqueo (paso 4) y la
> migración sin sorpresas (paso 7) son las dos cosas que, si se hacen mal, duelen.
