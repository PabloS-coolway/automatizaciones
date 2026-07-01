import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Form, InputGroup, Pagination, Spinner, Table } from 'react-bootstrap';
import { FileEarmarkExcel, Search, Upload } from 'react-bootstrap-icons';
import type { ImportReportDto, MaestroStatsDto, ReferenceDto } from '@yorga/contracts';
import { maestroGateway } from '../composition';
import { FileDropzone } from '../components/FileDropzone';
import { useAuth } from '../auth/AuthContext';

const PAGE_SIZE = 50;

/** Construye la lista de páginas a mostrar con elipsis alrededor de la actual. */
function pageWindow(current: number, totalPages: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - current) <= 1) out.push(p);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
}

export function BaseDatosPage() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<MaestroStatsDto | null>(null);
  const [items, setItems] = useState<ReferenceDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Importar
  const [ean, setEan] = useState<File[]>([]);
  const [upc, setUpc] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReportDto | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadStats = useCallback(() => {
    maestroGateway.getStats().then(setStats).catch((e) => setError((e as Error).message));
  }, []);

  const loadRefs = useCallback((q: string, p: number) => {
    setLoading(true);
    maestroGateway
      .listReferences(q, PAGE_SIZE, (p - 1) * PAGE_SIZE)
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => loadStats(), [loadStats]);

  // Al buscar (debounce) se vuelve a la página 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadRefs(search, 1);
    }, 250);
    return () => clearTimeout(t);
  }, [search, loadRefs]);

  function goTo(p: number) {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    loadRefs(search, p);
  }

  async function runImport() {
    if (ean.length === 0 || upc.length === 0) return;
    setImporting(true);
    setError('');
    setReport(null);
    try {
      const r = await maestroGateway.importCodes(ean[0], upc[0]);
      setReport(r);
      setEan([]);
      setUpc([]);
      loadStats();
      setPage(1);
      loadRefs(search, 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + items.length;

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Base de datos</h1>
        <p className="text-secondary mb-0">El maestro de códigos Coolway (fuente de verdad).</p>
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

      {isAdmin && (
      <Card className="mb-4">
        <Card.Body className="p-4">
          <Card.Title className="mb-1">Actualizar maestro</Card.Title>
          <p className="text-secondary small">
            Sube los exports de prepedidos <strong>EAN.xlsm</strong> y <strong>UPC.xlsm</strong>. Se unen por ref+talla,
            se calcula el SKU y se guardan en la base de datos (los códigos existentes se actualizan).
          </p>
          <div className="row g-3">
            <div className="col-md-6">
              <FileDropzone title="EAN.xlsm" hint="Export de prepedidos con EAN" accept=".xlsx,.xlsm" files={ean} onFiles={setEan} icon={<FileEarmarkExcel />} />
            </div>
            <div className="col-md-6">
              <FileDropzone title="UPC.xlsm" hint="Export de prepedidos con UPC" accept=".xlsx,.xlsm" files={upc} onFiles={setUpc} icon={<FileEarmarkExcel />} />
            </div>
          </div>
          <Button className="btn-brand mt-3" disabled={importing || ean.length === 0 || upc.length === 0} onClick={runImport}>
            {importing ? (
              <>
                <Spinner as="span" size="sm" animation="border" className="me-2" /> Importando…
              </>
            ) : (
              <>
                <Upload className="me-2" aria-hidden="true" /> Importar al maestro
              </>
            )}
          </Button>

          {report && (
            <>
              <div className={`summary ${report.issues.length ? 'warn' : 'ok'} mt-3`}>
                {report.merged} SKU procesados · {report.created} nuevos · {report.updated} actualizados
                {report.skipped ? ` · ${report.skipped} saltados` : ''} ·{' '}
                {report.issues.length ? `${report.issues.length} incidencias` : 'sin incidencias'}
              </div>
              {report.issues.length > 0 && (
                <div className="missing-box mt-2 small">
                  {Object.entries(
                    report.issues.reduce<Record<string, number>>((m, i) => ((m[i.reason] = (m[i.reason] ?? 0) + 1), m), {}),
                  ).map(([reason, count]) => (
                    <div key={reason}>
                      <strong>{count}</strong> · {reason}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
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
                Mostrando {from.toLocaleString('es-ES')}–{to.toLocaleString('es-ES')} de {total.toLocaleString('es-ES')}
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

          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-3">
              <span className="text-secondary small">
                Página {page} de {totalPages}
              </span>
              <Pagination size="sm" className="mb-0">
                <Pagination.Prev disabled={page === 1 || loading} onClick={() => goTo(page - 1)} />
                {pageWindow(page, totalPages).map((p, i) =>
                  p === '…' ? (
                    <Pagination.Ellipsis key={`e${i}`} disabled />
                  ) : (
                    <Pagination.Item key={p} active={p === page} onClick={() => goTo(p)}>
                      {p}
                    </Pagination.Item>
                  ),
                )}
                <Pagination.Next disabled={page === totalPages || loading} onClick={() => goTo(page + 1)} />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
