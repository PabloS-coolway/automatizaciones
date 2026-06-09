import { useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import type { MarketDto } from '@yorga/contracts';
import type { GenerationInput } from '../../domain/generation';

interface Props {
  markets: MarketDto[];
  loading: boolean;
  onGenerate: (input: GenerationInput) => void;
}

export function GenerateForm({ markets, loading, onGenerate }: Props) {
  const [market, setMarket] = useState('VALENCIA');
  const [master, setMaster] = useState<File | null>(null);
  const [orders, setOrders] = useState<File[]>([]);
  const [importadoPor, setImportadoPor] = useState('');

  const selected = markets.find((m) => m.code === market);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onGenerate({ master, orders, market, importadoPor: importadoPor || undefined });
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body>
        <Form onSubmit={submit}>
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Destino</Form.Label>
            <Form.Select value={market} onChange={(e) => setMarket(e.target.value)}>
              {markets.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} — {m.variant} · importado por {m.importadoPor}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">Excel maestro (REFERENCIAS COOLWAY)</Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx,.xlsm"
              onChange={(e) => setMaster((e.target as HTMLInputElement).files?.[0] ?? null)}
            />
            <Form.Text muted>La base de datos de códigos. Se sube una por temporada.</Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">PDFs de pedido de compra (uno o varios)</Form.Label>
            <Form.Control
              type="file"
              accept=".pdf"
              multiple
              onChange={(e) => setOrders(Array.from((e.target as HTMLInputElement).files ?? []))}
            />
            <Form.Text muted>Los pedidos de SAP. Puedes subir un bloque (mismo cliente/destino).</Form.Text>
          </Form.Group>

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

          <Button type="submit" variant="success" disabled={loading} className="w-100">
            {loading ? (
              <>
                <Spinner as="span" size="sm" animation="border" className="me-2" />
                Generando…
              </>
            ) : (
              `Generar etiquetas${orders.length ? ` (${orders.length} pedido${orders.length > 1 ? 's' : ''})` : ''}`
            )}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
}
