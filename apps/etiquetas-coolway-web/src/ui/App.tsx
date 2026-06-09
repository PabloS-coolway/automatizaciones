import { Alert, Container, Navbar } from 'react-bootstrap';
import { BoxSeamFill } from 'react-bootstrap-icons';
import { gateway, downloader } from './composition';
import { useLabels } from './useLabels';
import { GenerateForm } from './components/GenerateForm';
import { ResultsCard } from './components/ResultsCard';

export function App() {
  const { markets, loading, error, files, generate, downloadOne, downloadAll } = useLabels(gateway, downloader);

  return (
    <>
      <Navbar className="app-navbar" variant="dark">
        <Container>
          <Navbar.Brand className="d-flex align-items-center">
            <BoxSeamFill className="me-2" />
            Etiquetas Coolway
            <span className="brand-chip">Grupo Yorga</span>
          </Navbar.Brand>
        </Container>
      </Navbar>

      <Container style={{ maxWidth: 860 }} className="py-4">
        <div className="mb-4">
          <h1 className="h4 mb-1">Genera tus etiquetas en segundos</h1>
          <p className="text-secondary mb-0">
            Sube el Excel maestro y los PDF de pedido de compra de SAP, elige el destino y descarga las etiquetas listas.
          </p>
        </div>

        <GenerateForm markets={markets} loading={loading} onGenerate={generate} />

        {error && <Alert variant="danger">⚠ {error}</Alert>}

        <ResultsCard files={files} onDownloadOne={downloadOne} onDownloadAll={downloadAll} />

        <footer className="app-footer text-center mt-5">
          Grupo Yorga · Automatizaciones — herramienta interna
        </footer>
      </Container>
    </>
  );
}
