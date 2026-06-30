import { useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { FileEarmarkExcel, FilePdf, Tags } from 'react-bootstrap-icons';
import type { MarketDto } from '@yorga/contracts';
import type { GenerationInput } from '../../domain/generation';
import { FileDropzone } from './FileDropzone';

interface Props {
  markets: MarketDto[];
  loading: boolean;
  onGenerate: (input: GenerationInput) => void;
}

export function GenerateForm({ markets, loading, onGenerate }: Props) {
  const [market, setMarket] = useState('VALENCIA');
  const [master, setMaster] = useState<File[]>([]);
  const [orders, setOrders] = useState<File[]>([]);
  const [importadoPor, setImportadoPor] = useState('');

  const selected = markets.find((m) => m.code === market);
  const ready = master.length > 0 && orders.length > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onGenerate({ master: master[0] ?? null, orders, market, importadoPor: importadoPor || undefined });
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

          <div className="form-step">Ficheros</div>

          <div className="row g-3">
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
            <div className="col-md-6">
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
              Sube el <strong>Excel maestro</strong> y al menos un <strong>PDF de pedido</strong> para continuar.
            </div>
          )}
        </Form>
      </Card.Body>
    </Card>
  );
}
