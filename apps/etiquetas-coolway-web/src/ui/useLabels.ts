import { useEffect, useState } from 'react';
import type { GeneratedFileDto, MarketDto } from '@yorga/contracts';
import type { GenerationInput } from '../domain/generation';
import type { LabelsGateway } from '../application/ports/labels-gateway.port';
import type { FileDownloader } from '../application/ports/file-downloader.port';
import {
  ValidationError,
  downloadAll,
  downloadFile,
  generateLabels,
  loadMarkets,
} from '../application/use-cases/labels.use-cases';

/** Hook que conecta React con los casos de uso (capa de interfaz del hexágono). */
export function useLabels(gateway: LabelsGateway, downloader: FileDownloader) {
  const [markets, setMarkets] = useState<MarketDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<GeneratedFileDto[]>([]);

  useEffect(() => {
    loadMarkets(gateway)
      .then(setMarkets)
      .catch((e) => setError((e as Error).message));
  }, [gateway]);

  async function generate(input: GenerationInput): Promise<void> {
    setError('');
    setFiles([]);
    setLoading(true);
    try {
      const res = await generateLabels(gateway, input);
      setFiles(res.files);
    } catch (e) {
      setError(e instanceof ValidationError ? e.errors.join(' ') : (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return {
    markets,
    loading,
    error,
    files,
    generate,
    downloadOne: (f: GeneratedFileDto) => downloadFile(downloader, f),
    downloadAll: () => downloadAll(downloader, files),
  };
}
