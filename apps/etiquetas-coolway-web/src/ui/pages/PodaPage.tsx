import { useState } from 'react';
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { ArrowLeft, Download, FileEarmarkExcel, FileEarmarkText, Scissors } from 'react-bootstrap-icons';
import type { FicheroPodadoDto, PodaResponse } from '@yorga/contracts';
import { podaGateway } from '../composition';
import { FileDropzone } from '../components/FileDropzone';

const TIPO_LABEL: Record<FicheroPodadoDto['tipo'], string> = {
  materiales: 'Materiales',
  surtidos: 'Surtidos',
  tarifa906: 'Tarifas 906',
  tarifa073: 'Tarifas 073',
};

/** Descarga un fichero de texto (latin1) recibido en base64, con el nombre podado. */
function descargar(f: FicheroPodadoDto) {
  const bytes = Uint8Array.from(atob(f.podadoBase64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'text/plain' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = f.nombre.replace(/(\.txt)?$/i, '') + ' · podado.txt';
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * REQ-005 · Poda los ficheros de SAP a lo realmente comprado. Silvia sube el borrador de prepedidos y los
 * ficheros que le saca SAP; descarga los mismos ficheros pero con sólo lo comprado. Nunca inventa nada: si
 * algo comprado no aparece en un fichero, lo avisa.
 */
export function PodaPage() {
  const [borrador, setBorrador] = useState<File[]>([]);
  const [ficheros, setFicheros] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState<PodaResponse | null>(null);

  const ready = borrador.length > 0 && ficheros.length > 0;

  async function onPodar() {
    setError('');
    setLoading(true);
    try {
      setRes(await podaGateway.podar(borrador[0], ficheros));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setRes(null);
    setBorrador([]);
    setFicheros([]);
  }

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Podar ficheros de SAP</h1>
        <p className="text-secondary mb-0">
          Sube el <strong>borrador de prepedidos</strong> (Excel) y los ficheros que te saca SAP (materiales,
          tarifas, surtidos). Te los devuelve con <strong>sólo lo realmente comprado</strong>; el resto de líneas se anulan.
        </p>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

      {!res ? (
        <Card className="mb-4">
          <Card.Body className="p-4">
            <div className="row g-3">
              <div className="col-md-6">
                <FileDropzone
                  title="Borrador de prepedidos"
                  hint="El Excel de la compra (con la columna Suma)"
                  accept=".xlsx,.xlsm"
                  files={borrador}
                  onFiles={setBorrador}
                  icon={<FileEarmarkExcel />}
                />
              </div>
              <div className="col-md-6">
                <FileDropzone
                  title="Ficheros de SAP"
                  hint="materiales / tarifas 906 y 073 / surtidos (.txt)"
                  accept=".txt"
                  multiple
                  files={ficheros}
                  onFiles={setFicheros}
                  icon={<FileEarmarkText />}
                />
              </div>
            </div>

            <Button type="button" className="btn-brand w-100 py-2 mt-4" disabled={loading || !ready} onClick={onPodar}>
              {loading ? (
                <><Spinner as="span" size="sm" animation="border" className="me-2" /> Podando…</>
              ) : (
                <><Scissors className="me-2" aria-hidden="true" /> Podar{ficheros.length ? ` · ${ficheros.length} fichero${ficheros.length > 1 ? 's' : ''}` : ''}</>
              )}
            </Button>
            {!ready && !loading && (
              <div className="text-center text-secondary small mt-2">
                Sube el <strong>borrador</strong> y al menos un <strong>fichero de SAP</strong>.
              </div>
            )}
          </Card.Body>
        </Card>
      ) : (
        <>
          <div className="mb-3">
            <Button variant="outline-secondary" size="sm" onClick={reset}>
              <ArrowLeft className="me-1" aria-hidden="true" /> Podar otros
            </Button>
          </div>

          <Card>
            <Card.Body className="p-4">
              <Card.Title className="mb-1">Resultado</Card.Title>
              <p className="text-secondary small mb-3">
                Se dedujeron <strong>{res.compras}</strong> combinaciones compradas del borrador.
              </p>

              {res.comprasSinColor.length > 0 && (
                <Alert variant="warning" className="py-2">
                  ⚠ <strong>{res.comprasSinColor.length} referencia(s) comprada(s) no traen el código de color
                  (columna «Horma») en el borrador.</strong> Sin él no se puede podar por color
                  (materiales/surtidos) esas refs — saldrían anuladas. <strong>Rellena la «Horma»</strong> en el
                  borrador y vuelve a podar. Refs: {res.comprasSinColor.join(', ')}.
                </Alert>
              )}

              {res.sinReconocer.length > 0 && (
                <Alert variant="warning" className="py-2">
                  No se reconocieron (no se tocaron): {res.sinReconocer.join(', ')}. ¿Seguro que son ficheros de SAP?
                </Alert>
              )}

              <div className="d-flex flex-column gap-3">
                {res.ficheros.map((f) => (
                  <div key={f.nombre} className="d-flex justify-content-between align-items-center border rounded p-3">
                    <div>
                      <div className="fw-semibold">
                        {TIPO_LABEL[f.tipo]} <span className="text-secondary small">· {f.nombre}</span>
                      </div>
                      <div className="small text-secondary">
                        Quedan <strong>{f.conservadas}</strong> · se anulan {f.retiradas}
                      </div>
                      {f.compradoQueFalta.length > 0 && (
                        <div className="small text-danger mt-1">
                          ⚠ {f.compradoQueFalta.length} combinación(es) comprada(s) NO aparecen en este fichero
                          (venía incompleto): {f.compradoQueFalta.map((c) => `${c.familia}/${c.colorSap}`).join(', ')}
                        </div>
                      )}
                    </div>
                    <Button variant="outline-success" size="sm" onClick={() => descargar(f)}>
                      <Download className="me-1" aria-hidden="true" /> Descargar
                    </Button>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}
