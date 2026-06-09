import type { GenerateLabelsHttpResponse, MarketDto } from '@yorga/contracts';
import type { ValidGenerationInput } from '../domain/generation';
import type { LabelsGateway } from '../application/ports/labels-gateway.port';

/** Adapter: implementa el puerto LabelsGateway contra la API HTTP (NestJS). */
export class HttpLabelsGateway implements LabelsGateway {
  constructor(private readonly baseUrl = '/api') {}

  async getMarkets(): Promise<MarketDto[]> {
    const res = await fetch(`${this.baseUrl}/markets`);
    if (!res.ok) throw new Error('No se pudieron cargar los destinos.');
    return (await res.json()).markets;
  }

  async generate(input: ValidGenerationInput): Promise<GenerateLabelsHttpResponse> {
    const fd = new FormData();
    fd.append('master', input.master);
    input.orders.forEach((o) => fd.append('orders', o));
    if (input.market) fd.append('market', input.market);
    if (input.variant) fd.append('variant', input.variant);
    if (input.importadoPor) fd.append('importadoPor', input.importadoPor);

    const res = await fetch(`${this.baseUrl}/labels/generate`, { method: 'POST', body: fd });
    if (!res.ok) {
      let msg = 'Error generando etiquetas.';
      try {
        msg = (await res.json()).message ?? msg;
      } catch {
        /* noop */
      }
      throw new Error(msg);
    }
    return res.json();
  }
}
