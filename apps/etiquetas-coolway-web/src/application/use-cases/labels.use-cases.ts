import type { GeneratedFileDto, GenerateLabelsHttpResponse, MarketDto } from '@yorga/contracts';
import { GenerationInput, validateGenerationInput } from '../../domain/generation';
import type { LabelsGateway } from '../ports/labels-gateway.port';
import type { FileDownloader } from '../ports/file-downloader.port';

/** Error de validación de dominio (lista de mensajes para mostrar). */
export class ValidationError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join(' '));
    this.name = 'ValidationError';
  }
}

/** Casos de uso (orquestan dominio + puertos; sin React ni fetch). */
export function loadMarkets(gateway: LabelsGateway): Promise<MarketDto[]> {
  return gateway.getMarkets();
}

export function generateLabels(gateway: LabelsGateway, input: GenerationInput): Promise<GenerateLabelsHttpResponse> {
  const errors = validateGenerationInput(input);
  if (errors.length) throw new ValidationError(errors);
  return gateway.generate({
    master: input.master as File,
    orders: input.orders,
    market: input.market,
    variant: input.variant,
    importadoPor: input.importadoPor,
  });
}

export function downloadFile(downloader: FileDownloader, file: GeneratedFileDto): void {
  downloader.download(file.fileName, file.fileBase64);
}

/** Descarga todos los ficheros en un único ZIP. */
export function downloadAll(downloader: FileDownloader, files: GeneratedFileDto[]): Promise<void> {
  return downloader.downloadZip(
    files.map((f) => ({ fileName: f.fileName, base64: f.fileBase64 })),
    'etiquetas.zip',
  );
}
