import { Alert, Container } from 'react-bootstrap';
import { gateway, downloader } from './composition';
import { useLabels } from './useLabels';
import { GenerateForm } from './components/GenerateForm';
import { ResultsCard } from './components/ResultsCard';

export function App() {
  const { markets, loading, error, files, generate, downloadOne, downloadAll } = useLabels(gateway, downloader);

  return (
    <Container style={{ maxWidth: 820 }} className="py-4">
      <header className="mb-4">
        <h1 className="h3 mb-1">Etiquetas Coolway</h1>
        <p className="text-secondary mb-0">
          Sube el/los PDF de pedido de compra de SAP y el Excel maestro, elige el destino y descarga las etiquetas.
        </p>
      </header>

      <GenerateForm markets={markets} loading={loading} onGenerate={generate} />

      {error && <Alert variant="danger">⚠ {error}</Alert>}

      <ResultsCard files={files} onDownloadOne={downloadOne} onDownloadAll={downloadAll} />
    </Container>
  );
}
