import type { CreateDestinationDto, DestinationDto, UpdateDestinationDto } from '@yorga/contracts';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: administración de destinos contra la API HTTP (endpoints sólo admin · REQ-004). */
export class HttpDestinosGateway {
  async list(): Promise<DestinationDto[]> {
    const res = await apiFetch('/destinos');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los destinos.'));
    return res.json();
  }

  async create(input: CreateDestinationDto): Promise<DestinationDto> {
    const res = await apiFetch('/destinos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo crear el destino.'));
    return res.json();
  }

  async update(id: number, input: UpdateDestinationDto): Promise<DestinationDto> {
    const res = await apiFetch(`/destinos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo actualizar el destino.'));
    return res.json();
  }
}
