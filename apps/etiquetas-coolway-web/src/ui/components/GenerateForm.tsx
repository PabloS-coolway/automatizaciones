import { useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { FileEarmarkExcel, FilePdf, Tag, Tags } from 'react-bootstrap-icons';
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
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              <Tag className="me-2 text-secondary" />
              Destino
            </Form.Label>
            <Form.Select value={market} onChange={(e) => setMarket(e.target.value)} size="lg">
              {markets.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code}
                </option>
              ))}
            </Form.Select>
            {selected && (
              <div className="hint-line text-secondary mt-2">
                Generará <strong>{selected.variant.replace('_', ' + ')}</strong> · importado por{' '}
                <strong>{selected.importadoPor}</strong>
              </div>
            )}
          </Form.Group>

          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <FileDropzone
                title="Excel maestro"
                hint="REFERENCIAS COOLWAY.xlsx — arrastra o haz clic"
                accept=".xlsx,.xlsm"
                files={master}
                onFiles={setMaster}
                icon={<FileEarmarkExcel />}
              />
            </div>
            <div className="col-md-6">
              <FileDropzone
                title="PDFs de pedido de compra"
                hint="Uno o varios PDF de SAP — arrastra o haz clic"
                accept=".pdf"
                multiple
                files={orders}
                onFiles={setOrders}
                icon={<FilePdf />}
              />
            </div>
          </div>

          <Form.Group className="mb-4">
            <Form.Label className="fw-semibold">Importado por (opcional)</Form.Label>
            <Form.Control
              type="text"
              placeholder={selected?.importadoPor ?? ''}
              value={importadoPor}
              onChange={(e) => setImportadoPor(e.target.value)}
            />
            <Form.Text muted>Sobrescribe el valor por defecto del destino.</Form.Text>
          </Form.Group>

          <Button type="submit" className="btn-brand w-100 py-2" disabled={loading || !ready}>
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
