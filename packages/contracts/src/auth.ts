/** Roles de acceso a la herramienta (RBAC mínimo). */
export type Role = 'operador' | 'admin';

/** Usuario tal como lo expone la API (nunca incluye la contraseña). */
export interface UserDto {
  id: number;
  email: string;
  name: string;
  role: Role;
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

/** Respuesta de login: token JWT + datos del usuario autenticado. */
export interface LoginResponse {
  token: string;
  user: UserDto;
}
