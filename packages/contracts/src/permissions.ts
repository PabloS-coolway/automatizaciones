/**
 * REQ-006 · Catálogo de FEATURES (permisos por sección/acción).
 *
 * ⚠️ Es una lista **CERRADA y definida en código**: una feature es algo que la app sabe proteger de
 * verdad. Se puede asignar/quitar a un rol desde el panel, pero **no se inventan features nuevas desde la
 * web** — sería un permiso que no protege nada (o peor, que da sensación de seguridad sin darla). Mismo
 * principio que la variante de destinos (REQ-004): lo self-administrable es la asignación rol↔feature, no
 * el catálogo.
 */
export const FEATURES = [
  'etiquetas.ver',
  'maestro.ver',
  'maestro.cargar',
  'maestro.color-web.editar',
  'destinos.gestionar',
  'usuarios.gestionar',
  'usuarios.password',
  'roles.gestionar',
  'actividad.ver',
] as const;

export type Feature = (typeof FEATURES)[number];

/** Cómo se lee cada feature en la pantalla de roles. */
export const FEATURE_LABELS: Record<Feature, string> = {
  'etiquetas.ver': 'Generar etiquetas',
  'maestro.ver': 'Consultar la base de datos (maestro)',
  'maestro.cargar': 'Cargar / importar el maestro',
  'maestro.color-web.editar': 'Editar el «color web» del maestro',
  'destinos.gestionar': 'Gestionar destinos',
  'usuarios.gestionar': 'Gestionar usuarios',
  'usuarios.password': 'Cambiar la contraseña de usuarios',
  'roles.gestionar': 'Gestionar roles y permisos',
  'actividad.ver': 'Ver el log de actividad',
};

/** La feature sin la que nadie podría volver a administrar: no puede quedarse sin ningún rol que la tenga. */
export const FEATURE_GESTION_ROLES: Feature = 'roles.gestionar';

export function isFeature(x: string): x is Feature {
  return (FEATURES as readonly string[]).includes(x);
}

/** Un rol tal como lo ve la pantalla de administración (REQ-006). */
export interface RoleDto {
  id: number;
  /** Identidad del rol (no se cambia): `operador`, `admin`, `contable`… */
  key: string;
  name: string;
  features: Feature[];
  active: boolean;
  /** Roles de sistema (operador/admin): no se borran ni se les cambia la clave. */
  system: boolean;
}

/** Alta de rol. `features` va acotada al catálogo cerrado. */
export interface CreateRoleDto {
  key: string;
  name: string;
  features: Feature[];
}

/** Edición (parcial). El `key` NO se cambia: es la identidad del rol. */
export interface UpdateRoleDto {
  name?: string;
  features?: Feature[];
  active?: boolean;
}
