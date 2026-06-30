import { useState } from 'react';
import { Alert, Toast, ToastContainer } from 'react-bootstrap';
import { CheckCircleFill } from 'react-bootstrap-icons';
import type { GeneratedFileDto } from '@yorga/contracts';
import { gateway, downloader } from '../composition';
import { useLabels } from '../useLabels';
import { GenerateForm } from '../components/GenerateForm';
import { ResultsCard } from '../components/ResultsCard';

export function EtiquetasPage() {
  const { markets, loading, error, files, generate, downloadOne, downloadAll } = useLabels(gateway, downloader);
  const [toast, setToast] = useState('');

  const onDownloadOne = (f: GeneratedFileDto) => {
    downloadOne(f);
    setToast(`Descargado ${f.fileName}`);
  };
  const onDownloadAll = () => {
    downloadAll();
    setToast(`Descargados ${files.length} ficheros`);
  };

  return (
    <div className="page">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Etiquetas</h1>
        <p className="text-secondary mb-0">
          Sube el Excel maestro y los PDF de pedido de compra de SAP, elige el destino y descarga las etiquetas.
        </p>
      </header>

      <GenerateForm markets={markets} loading={loading} onGenerate={generate} />

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
