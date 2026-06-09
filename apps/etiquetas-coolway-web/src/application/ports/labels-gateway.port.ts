import type { GenerateLabelsHttpResponse, MarketDto } from '@yorga/contracts';
import type { ValidGenerationInput } from '../../domain/generation';

/** Puerto de salida: acceso a la API de etiquetas (lo implementa infraestructura). */
export interface LabelsGateway {
  getMarkets(): Promise<MarketDto[]>;
  generate(input: ValidGenerationInput): Promise<GenerateLabelsHttpResponse>;
}
