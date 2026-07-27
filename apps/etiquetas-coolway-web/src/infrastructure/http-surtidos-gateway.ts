import type { CreateSurtidoDto, SurtidoDto, UpdateSurtidoDto } from '@yorga/contracts';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: catálogo de surtidos contra la API HTTP (REQ-010 · Fase 2, requiere `maestro.cargar`). */
export class HttpSurtidosGateway {
  async list(): Promise<SurtidoDto[]> {
    const res = await apiFetch('/surtidos');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los surtidos.'));
    return res.json();
  }

  async create(input: CreateSurtidoDto): Promise<SurtidoDto> {
    const res = await apiFetch('/surtidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo asignar el surtido.'));
    return res.json();
  }

  async update(id: number, input: UpdateSurtidoDto): Promise<SurtidoDto> {
    const res = await apiFetch(`/surtidos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo actualizar el surtido.'));
    return res.json();
  }

  async remove(id: number): Promise<void> {
    const res = await apiFetch(`/surtidos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo quitar el surtido.'));
  }
}
