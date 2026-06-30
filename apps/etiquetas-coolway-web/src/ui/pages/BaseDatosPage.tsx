import { useEffect, useState } from 'react';
import { Alert, Card, Form, InputGroup, Spinner, Table } from 'react-bootstrap';
import { Search } from 'react-bootstrap-icons';
import type { MaestroStatsDto, ReferenceDto } from '@yorga/contracts';
import { maestroGateway } from '../composition';

const TAKE = 100;

export function BaseDatosPage() {
  const [stats, setStats] = useState<MaestroStatsDto | null>(null);
  const [items, setItems] = useState<ReferenceDto[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    maestroGateway.getStats().then(setStats).catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      maestroGateway
        .listReferences(search, TAKE, 0)
        .then((r) => {
          setItems(r.items);
          setTotal(r.total);
        })
        .catch((e) => setError((e as Error).message))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Base de datos</h1>
        <p className="text-secondary mb-0">El maestro de códigos Coolway (fuente de verdad). Solo lectura.</p>
      </header>

      {error && <Alert variant="danger">⚠ {error}</Alert>}

      {stats && (
        <div className="kpis mb-4">
          <div className="kpi">
            <div className="kpi-val">{stats.total.toLocaleString('es-ES')}</div>
            <div className="kpi-lbl">SKU</div>
          </div>
          <div className="kpi">
            <div className="kpi-val">{stats.models.length}</div>
            <div className="kpi-lbl">Modelos</div>
          </div>
          <div className="kpi">
            <div className="kpi-val">{stats.conEan.toLocaleString('es-ES')}</div>
            <div className="kpi-lbl">Con EAN13</div>
          </div>
          <div className="kpi">
            <div className="kpi-val">{stats.conUpc.toLocaleString('es-ES')}</div>
            <div className="kpi-lbl">Con UPC</div>
          </div>
        </div>
      )}

      <Card>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
            <Card.Title className="mb-0">Referencias</Card.Title>
            <InputGroup size="sm" style={{ maxWidth: 280 }}>
              <InputGroup.Text>
                <Search aria-hidden="true" />
              </InputGroup.Text>
              <Form.Control
                placeholder="Buscar modelo, color, ref, SKU, código…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar en el maestro"
              />
            </InputGroup>
          </div>

          <div className="text-secondary small mb-2">
            {loading ? (
              <>
                <Spinner as="span" size="sm" animation="border" className="me-2" />
                Cargando…
              </>
            ) : (
              <>
                Mostrando {items.length} de {total.toLocaleString('es-ES')} referencias
                {search && ' (filtradas)'}
              </>
            )}
          </div>

          <div className="labels-preview">
            <Table size="sm" striped hover responsive className="mb-0">
              <thead>
                <tr>
                  <th>style</th>
                  <th>color</th>
                  <th>ref.</th>
                  <th>talla</th>
                  <th>SKU</th>
                  <th>ean13</th>
                  <th>upc</th>
                  <th>color web</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.sku}>
                    <td>{r.style}</td>
                    <td>{r.color}</td>
                    <td>{r.ref}</td>
                    <td>{r.size}</td>
                    <td>{r.sku}</td>
                    <td>{r.ean13 ?? <span className="text-secondary">—</span>}</td>
                    <td>{r.upc ?? <span className="text-secondary">—</span>}</td>
                    <td>{r.colorNameWeb ?? <span className="text-secondary">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
