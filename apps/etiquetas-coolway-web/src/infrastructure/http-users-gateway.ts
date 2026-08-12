import type { CreateUserRequest, ImportUsuariosResultDto, UpdateUserRequest, UserDto } from '@yorga/contracts';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: administración de usuarios contra la API HTTP (endpoints sólo admin). */
export class HttpUsersGateway {
  async list(): Promise<UserDto[]> {
    const res = await apiFetch('/users');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los usuarios.'));
    return res.json();
  }

  async create(input: CreateUserRequest): Promise<UserDto> {
    const res = await apiFetch('/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo crear el usuario.'));
    return res.json();
  }

  async update(id: number, input: UpdateUserRequest): Promise<UserDto> {
    const res = await apiFetch(`/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo actualizar el usuario.'));
    return res.json();
  }

  /** Import masivo desde Excel: crea usuarios (con contraseña temporal) y su ficha RRHH. */
  async importar(file: File): Promise<ImportUsuariosResultDto> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiFetch('/users/import', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo importar el Excel.'));
    return res.json();
  }
}
