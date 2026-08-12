import { Feature } from './permissions';

/**
 * Rol de un usuario = la **clave** de un rol gobernable (REQ-006). Antes era un enum fijo
 * (`operador | admin`); ahora es un string porque los roles son dato administrable. `operador` y `admin`
 * siguen existiendo (roles de sistema), pero se pueden crear más.
 */
export type Role = string;

/** Usuario tal como lo expone la API (nunca incluye la contraseña). */
export interface UserDto {
  id: number;
  email: string;
  name: string;
  /** Clave del rol del usuario. */
  role: Role;
  /** Las features efectivas de ese rol — lo que el front usa para mostrar/ocultar y la API para permitir. */
  features: Feature[];
  active: boolean;
}

/** POST /api/users (alta de usuario, sólo admin). */
export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: Role;
}

/** PATCH /api/users/:id (cambiar rol, activar/desactivar o resetear contraseña; sólo admin). */
export interface UpdateUserRequest {
  role?: Role;
  active?: boolean;
  password?: string;
}

/** POST /api/auth/login */
export interface LoginRequest {
  email: string;
  password: string;
}

/** POST /api/auth/cambiar-password (el propio usuario cambia su contraseña; exige la actual). */
export interface CambiarPasswordDto {
  actual: string;
  nueva: string;
}

// ---- Import masivo de usuarios (desde Excel) ----

/** Un usuario creado por el import, con la contraseña temporal generada (para repartir). */
export interface UsuarioImportadoDto {
  email: string;
  name: string;
  role: Role;
  /** Contraseña temporal generada; el usuario la cambia al entrar. */
  passwordTemporal: string;
  /** ¿Se creó también su ficha de empleado (RRHH)? */
  fichaCreada: boolean;
}

/** Una fila que NO se importó, con el motivo (duplicado, datos incompletos, rol inválido…). */
export interface UsuarioSaltadoDto {
  fila: number;
  email: string;
  motivo: string;
}

/** Resultado del import masivo de usuarios. */
export interface ImportUsuariosResultDto {
  creados: UsuarioImportadoDto[];
  saltados: UsuarioSaltadoDto[];
}

/** Respuesta de login: token JWT + datos del usuario autenticado. */
export interface LoginResponse {
  token: string;
  user: UserDto;
}
