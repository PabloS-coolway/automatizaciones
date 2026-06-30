import { useState } from 'react';
import { Button, ButtonGroup, Card, Form, Spinner } from 'react-bootstrap';
import { Database, FileEarmarkExcel, FilePdf, Tags } from 'react-bootstrap-icons';
import type { MarketDto, MasterSourceKind } from '@yorga/contracts';
import type { GenerationInput } from '../../domain/generation';
import { FileDropzone } from './FileDropzone';

interface Props {
  markets: MarketDto[];
  loading: boolean;
  onGenerate: (input: GenerationInput) => void;
}

export function GenerateForm({ markets, loading, onGenerate }: Props) {
  const [market, setMarket] = useState('VALENCIA');
  const [masterSource, setMasterSource] = useState<MasterSourceKind>('db');
  const [master, setMaster] = useState<File[]>([]);
  const [orders, setOrders] = useState<File[]>([]);
  const [importadoPor, setImportadoPor] = useState('');

  const selected = markets.find((m) => m.code === market);
  const ready = orders.length > 0 && (masterSource === 'db' || master.length > 0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onGenerate({ masterSource, master: master[0] ?? null, orders, market, importadoPor: importadoPor || undefined });
  }

  return (
    <Card className="mb-4">
      <Card.Body className="p-4">
        <Form onSubmit={submit}>
          <div className="row g-3">
            <div className="col-md-6">
              <Form.Label className="fw-semibold">Destino</Form.Label>
              <Form.Select value={market} onChange={(e) => setMarket(e.target.value)}>
                {markets.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.code}
                  </option>
                ))}
              </Form.Select>
              {selected && (
                <div className="mt-2">
                  <span className="variant-badge">{selected.variant.replace('_', ' + ')}</span>
                </div>
              )}
            </div>
            <div className="col-md-6">
              <Form.Label className="fw-semibold">Importado por</Form.Label>
              <Form.Control
                type="text"
                placeholder={selected?.importadoPor ?? ''}
                value={importadoPor}
                onChange={(e) => setImportadoPor(e.target.value)}
              />
              <Form.Text muted>Por defecto, el del destino.</Form.Text>
            </div>
          </div>

          <div className="form-step d-flex justify-content-between align-items-center">
            <span>Ficheros</span>
            <ButtonGroup size="sm" aria-label="Origen del maestro">
              <Button
                variant={masterSource === 'db' ? 'primary' : 'outline-secondary'}
                onClick={() => setMasterSource('db')}
              >
                <Database className="me-1" aria-hidden="true" /> Maestro: base de datos
              </Button>
              <Button
                variant={masterSource === 'file' ? 'primary' : 'outline-secondary'}
                onClick={() => setMasterSource('file')}
              >
                <FileEarmarkExcel className="me-1" aria-hidden="true" /> Subir Excel
              </Button>
            </ButtonGroup>
          </div>

          <div className="row g-3">
            {masterSource === 'file' && (
              <div className="col-md-6">
                <FileDropzone
                  title="Excel maestro"
                  hint="REFERENCIAS COOLWAY.xlsx"
                  accept=".xlsx,.xlsm"
                  files={master}
                  onFiles={setMaster}
                  icon={<FileEarmarkExcel />}
                />
              </div>
            )}
            <div className={masterSource === 'file' ? 'col-md-6' : 'col-12'}>
              <FileDropzone
                title="PDFs de pedido"
                hint="Uno o varios PDF de SAP"
                accept=".pdf"
                multiple
                files={orders}
                onFiles={setOrders}
                icon={<FilePdf />}
              />
            </div>
          </div>
          {masterSource === 'db' && (
            <Form.Text muted className="d-block mt-2">
              Los códigos se leen del maestro en la base de datos. Solo necesitas subir los PDF.
            </Form.Text>
          )}

          <Button type="submit" className="btn-brand w-100 py-2 mt-4" disabled={loading || !ready}>
            {loading ? (
              <>
                <Spinner as="span" size="sm" animation="border" className="me-2" />
                Generando…
              </>
            ) : (
              <>
                <Tags className="me-2" aria-hidden="true" />
                Generar etiquetas{orders.length ? ` · ${orders.length} pedido${orders.length > 1 ? 's' : ''}` : ''}
              </>
            )}
          </Button>
          {!ready && !loading && (
            <div className="text-center text-secondary small mt-2">
              {masterSource === 'file' ? (
                <>Sube el <strong>Excel maestro</strong> y al menos un <strong>PDF de pedido</strong>.</>
              ) : (
                <>Sube al menos un <strong>PDF de pedido</strong> para continuar.</>
              )}
            </div>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
}
