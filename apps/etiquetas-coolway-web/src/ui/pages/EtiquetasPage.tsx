import { Alert } from 'react-bootstrap';
import { gateway, downloader } from '../composition';
import { useLabels } from '../useLabels';
import { GenerateForm } from '../components/GenerateForm';
import { ResultsCard } from '../components/ResultsCard';

export function EtiquetasPage() {
  const { markets, loading, error, files, generate, downloadOne, downloadAll } = useLabels(gateway, downloader);

  return (
    <div className="page">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Etiquetas</h1>
        <p className="text-secondary mb-0">
          Sube el Excel maestro y los PDF de pedido de compra de SAP, elige el destino y descarga las etiquetas.
        </p>
      </header>

      <GenerateForm markets={markets} loading={loading} onGenerate={generate} />
      {error && <Alert variant="danger">⚠ {error}</Alert>}
      <ResultsCard files={files} onDownloadOne={downloadOne} onDownloadAll={downloadAll} />
    </div>
  );
}
