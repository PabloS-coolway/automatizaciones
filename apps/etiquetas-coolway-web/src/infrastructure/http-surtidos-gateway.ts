import type { CreatePodaSurtidoDto, PodaSurtidoDto } from '@yorga/contracts';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: catálogo de surtidos por grupo contra la API HTTP (REQ-011, requiere `maestro.cargar`). */
export class HttpSurtidosGateway {
  async list(): Promise<PodaSurtidoDto[]> {
    const res = await apiFetch('/surtidos');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los surtidos.'));
    return res.json();
  }

  async agregar(input: CreatePodaSurtidoDto): Promise<PodaSurtidoDto> {
    const res = await apiFetch('/surtidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo añadir el surtido.'));
    return res.json();
  }

  async quitar(id: number): Promise<void> {
    const res = await apiFetch(`/surtidos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo quitar el surtido.'));
  }
}
