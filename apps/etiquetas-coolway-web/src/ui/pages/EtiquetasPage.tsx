import { useState } from 'react';
import { Alert, Button, Toast, ToastContainer } from 'react-bootstrap';
import { ArrowLeft, CheckCircleFill } from 'react-bootstrap-icons';
import type { GeneratedFileDto } from '@yorga/contracts';
import { gateway, downloader } from '../composition';
import { useLabels } from '../useLabels';
import { GenerateForm } from '../components/GenerateForm';
import { ResultsCard } from '../components/ResultsCard';

export function EtiquetasPage() {
  const { markets, loading, error, files, generate, reset, downloadOne, downloadAll } = useLabels(gateway, downloader);
  const [toast, setToast] = useState('');
  const hasResults = files.length > 0;

  const onDownloadOne = (f: GeneratedFileDto) => {
    downloadOne(f);
    setToast(`Descargado ${f.fileName}`);
  };
  const onDownloadAll = () => {
    downloadAll();
    setToast(`Descargando ${files.length} ficheros en un ZIP`);
  };

  return (
    <div className={`page ${hasResults ? 'page-wide' : ''}`}>
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Etiquetas</h1>
        <p className="text-secondary mb-0">
          Sube el Excel maestro y los PDF de pedido de compra de SAP, elige el destino y descarga las etiquetas.
        </p>
      </header>

      {!hasResults ? (
        <GenerateForm markets={markets} loading={loading} onGenerate={generate} />
      ) : (
        <div className="mb-3">
          <Button variant="outline-secondary" size="sm" onClick={reset}>
            <ArrowLeft className="me-1" aria-hidden="true" /> Generar otro
          </Button>
        </div>
      )}

      <div aria-live="polite">
        {error && <Alert variant="danger">⚠ {error}</Alert>}
        <ResultsCard files={files} onDownloadOne={onDownloadOne} onDownloadAll={onDownloadAll} />
      </div>

      <ToastContainer position="bottom-end" className="p-3">
        <Toast show={!!toast} onClose={() => setToast('')} delay={3000} autohide bg="success">
          <Toast.Body className="text-white d-flex align-items-center">
            <CheckCircleFill className="me-2" aria-hidden="true" /> {toast}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}
