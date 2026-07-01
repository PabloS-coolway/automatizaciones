/** Roles de acceso a la herramienta (RBAC mínimo). */
export type Role = 'operador' | 'admin';

/** Usuario tal como lo expone la API (nunca incluye la contraseña). */
export interface UserDto {
  id: number;
  email: string;
  name: string;
  role: Role;
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
