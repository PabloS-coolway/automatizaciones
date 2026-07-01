import type { GenerateLabelsHttpResponse, MarketDto } from '@yorga/contracts';
import type { ValidGenerationInput } from '../domain/generation';
import type { LabelsGateway } from '../application/ports/labels-gateway.port';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: implementa el puerto LabelsGateway contra la API HTTP (NestJS), con el token de sesión. */
export class HttpLabelsGateway implements LabelsGateway {
  async getMarkets(): Promise<MarketDto[]> {
    const res = await apiFetch('/markets');
    if (!res.ok) throw new Error('No se pudieron cargar los destinos.');
    return (await res.json()).markets;
  }

  async generate(input: ValidGenerationInput): Promise<GenerateLabelsHttpResponse> {
    const fd = new FormData();
    fd.append('masterSource', input.masterSource);
    if (input.masterSource === 'file' && input.master) fd.append('master', input.master);
    input.orders.forEach((o) => fd.append('orders', o));
    if (input.market) fd.append('market', input.market);
    if (input.variant) fd.append('variant', input.variant);
    if (input.importadoPor) fd.append('importadoPor', input.importadoPor);

    const res = await apiFetch('/labels/generate', { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await errorMessage(res, 'Error generando etiquetas.'));
    return res.json();
  }
}
