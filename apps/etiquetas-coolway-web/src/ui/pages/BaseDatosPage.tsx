import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, Form, InputGroup, Spinner, Tab, Tabs } from 'react-bootstrap';
import { Database, Download, FileEarmarkExcel, Search, Upload } from 'react-bootstrap-icons';
import {
  VALOR_VACIO,
  type ImportReportDto,
  type MaestroStatsDto,
  type ReferenceDto,
  type RemovedRowDto,
  type SeedIssueDto,
  type SeedReportDto,
  type SharedEan13Dto,
} from '@yorga/contracts';
import { maestroGateway } from '../composition';
import { FileDropzone } from '../components/FileDropzone';
import { ColorWebCell } from '../components/ColorWebCell';
import { useAuth } from '../auth/AuthContext';
import { Column, DataTable, toApiFilters, useMemoryTable, useServerTable } from '../components/table';

/** Filas rechazadas al cargar el maestro. Filtrable por modelo/motivo: así se atacan por lotes. */
function TablaRechazadas({ issues }: { issues: SeedIssueDto[] }) {
  const columns = useMemo<Column<SeedIssueDto>[]>(
    () => [
      { key: 'style', label: 'modelo', value: (i) => i.style, render: (i) => <strong>{i.style}</strong> },
      { key: 'color', label: 'color', value: (i) => i.color },
      { key: 'ref', label: 'ref.', value: (i) => i.ref },
      { key: 'size', label: 'talla', value: (i) => i.size },
      {
        key: 'reason',
        label: 'motivo',
        value: (i) => (i.reason === 'duplicate_ean13' ? 'EAN13 duplicado' : 'rechazada'),
        render: (i) => (
          <>
            {i.reason === 'duplicate_ean13' ? 'EAN13 duplicado' : 'rechazada'}
            {i.detail && <div className="text-secondary">{i.detail}</div>}
          </>
        ),
      },
    ],
    [],
  );
  const model = useMemoryTable(issues, columns);
  return <DataTable model={model} allRows={issues} rowKey={(i) => `${i.ref}-${i.size}`} />;
}

/** Filas BORRADAS por quedar huérfanas (típico: se corrigió su talla). Se muestran siempre. */
function TablaBorradas({ removed }: { removed: RemovedRowDto[] }) {
  const columns = useMemo<Column<RemovedRowDto>[]>(
    () => [
      { key: 'style', label: 'modelo', value: (r) => r.style, render: (r) => <strong>{r.style}</strong> },
      { key: 'color', label: 'color', value: (r) => r.color },
      { key: 'ref', label: 'ref.', value: (r) => r.ref },
      { key: 'size', label: 'talla borrada', value: (r) => r.size },
    ],
    [],
  );
  const model = useMemoryTable(removed, columns);
  return <DataTable model={model} allRows={removed} rowKey={(r) => `${r.ref}-${r.size}`} />;
}

/** EAN13 que comparten productos distintos. El modelo es lo que se quiere filtrar (GOAL, BECKS…). */
function TablaEanCompartidos({ shared }: { shared: SharedEan13Dto[] }) {
  const columns = useMemo<Column<SharedEan13Dto>[]>(
    () => [
      { key: 'ean13', label: 'EAN13', value: (s) => s.ean13, render: (s) => <strong>{s.ean13}</strong> },
      {
        key: 'productos',
        label: 'productos que lo comparten',
        // El valor crudo junta los productos: así se puede filtrar por "GOAL" o "BECKS" y ordenar.
        value: (s) => s.rows.map((r) => `${r.style} ${r.color}`).join(' · '),
        render: (s) => (
          <>
            {s.rows.map((r) => (
              <div key={`${r.ref}-${r.size}`}>
                {r.style} {r.color} · ref {r.ref} · talla {r.size}
              </div>
            ))}
          </>
        ),
      },
    ],
    [],
  );
  const model = useMemoryTable(shared, columns);
  return <DataTable model={model} allRows={shared} rowKey={(s) => s.ean13} />;
}

export function BaseDatosPage() {
  const { isAdmin, hasFeature } = useAuth();
  const puedeEditarColorWeb = hasFeature('maestro.color-web.editar');
  // Refs para que la definición de columnas no dependa de estado que cambia (y no rehaga la tabla):
  // los valores para el desplegable, y la forma de recargar tras editar.
  const colorWebOptionsRef = useRef<string[]>([]);
  const reloadRef = useRef<() => void>(() => {});
  const [stats, setStats] = useState<MaestroStatsDto | null>(null);
  const [search, setSearch] = useState('');
  const [searchAplicada, setSearchAplicada] = useState('');
  const [error, setError] = useState('');

  // Importar códigos (EAN/UPC de prepedidos)
  const [ean, setEan] = useState<File[]>([]);
  const [upc, setUpc] = useState<File[]>([]);
  const [importing, setImporting] = useState(false);
  const [report, setReport] = useState<ImportReportDto | null>(null);

  // Cargar maestro completo (REFERENCIAS COOLWAY.xlsx)
  const [masterFile, setMasterFile] = useState<File[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedReport, setSeedReport] = useState<SeedReportDto | null>(null);

  const loadStats = useCallback(() => {
    maestroGateway.getStats().then(setStats).catch((e) => setError((e as Error).message));
  }, []);

  useEffect(() => loadStats(), [loadStats]);

  // REQ-009 · valores existentes para el desplegable de "color web" (sólo si el rol puede editar).
  useEffect(() => {
    if (!puedeEditarColorWeb) return;
    maestroGateway
      .getFacets('colorNameWeb', {})
      .then((f) => {
        colorWebOptionsRef.current = f.values.map((v) => v.value).filter((v) => v !== VALOR_VACIO);
      })
      .catch(() => undefined);
  }, [puedeEditarColorWeb]);

  // La búsqueda global se aplica con un respiro, para no llamar a la API en cada tecla.
  useEffect(() => {
    const t = setTimeout(() => setSearchAplicada(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const vacio = <span className="text-secondary">—</span>;

  /**
   * REQ-009 · Editar el "color web" de una fila propaga a todas las tallas de su (ref, color) y lo marca
   * como editado a mano. Tras guardar se recarga la tabla para reflejar el nuevo valor.
   */
  const editarColorWeb = useCallback(async (row: ReferenceDto, valor: string, nuevo: boolean) => {
    setError('');
    await maestroGateway.updateColorWeb({ ref: row.ref, color: row.color, colorNameWeb: valor, nuevo });
    reloadRef.current();
  }, []);

  /**
   * El TIPO de filtro se declara aquí a mano (no se deduce de las filas cargadas): la cardinalidad
   * real está en la BD. Con 100 filas en pantalla, `sku` parecería tener pocos valores distintos y
   * saldría un desplegable de casillas… con 5.736 valores detrás.
   */
  const columns = useMemo<Column<ReferenceDto>[]>(
    () => [
      { key: 'style', label: 'modelo', value: (r) => r.style, filter: 'values' },
      { key: 'color', label: 'color', value: (r) => r.color, filter: 'values' },
      { key: 'ref', label: 'ref.', value: (r) => r.ref, filter: 'text' },
      { key: 'size', label: 'talla', value: (r) => r.size, filter: 'values' },
      { key: 'sku', label: 'SKU', value: (r) => r.sku, filter: 'text' },
      { key: 'ean13', label: 'ean13', value: (r) => r.ean13, filter: 'text', render: (r) => r.ean13 ?? vacio },
      { key: 'upc', label: 'upc', value: (r) => r.upc, filter: 'text', render: (r) => r.upc ?? vacio },
      {
        key: 'colorNameWeb',
        label: 'color web',
        value: (r) => r.colorNameWeb,
        filter: 'values',
        // Sólo editable si el rol tiene la feature; si no, texto plano (mismo valor CRUDO para filtrar/ordenar).
        render: puedeEditarColorWeb
          ? (r) => (
              <ColorWebCell
                value={r.colorNameWeb}
                options={colorWebOptionsRef.current}
                refCodigo={r.ref}
                color={r.color}
                onSave={(valor, nuevo) => editarColorWeb(r, valor, nuevo)}
              />
            )
          : (r) => r.colorNameWeb ?? vacio,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puedeEditarColorWeb, editarColorWeb],
  );

  const maestro = useServerTable(maestroGateway, columns, searchAplicada, setError);
  reloadRef.current = maestro.reload ?? (() => {});
  const [exportando, setExportando] = useState(false);

  /**
   * Exporta EXACTAMENTE lo que se está viendo: los mismos filtros y el mismo orden.
   * Se reusa `toApiFilters`, el mismo traductor que usa la tabla para pedir los datos — así no hay
   * forma de que el Excel y la pantalla dejen de coincidir.
   */
  async function exportar() {
    setExportando(true);
    setError('');
    try {
      const filtros = toApiFilters(maestro.filters, maestro.sort, searchAplicada);
      const { blob, fileName } = await maestroGateway.exportReferences(filtros);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExportando(false);
    }
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
      maestro.reload?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function runSeed() {
    if (masterFile.length === 0) return;
    setSeeding(true);
    setError('');
    setSeedReport(null);
    try {
      const r = await maestroGateway.seedMaster(masterFile[0]);
      setSeedReport(r);
      setMasterFile([]);
      loadStats();
      maestro.reload?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Base de datos</h1>
        <p className="text-secondary mb-0">El maestro de códigos Coolway (fuente de verdad).</p>
      </header>

      {error && <Alert variant="danger">⚠ {error}</Alert>}

      {/* Fijos: explorando 5.736 referencias, el total es la referencia para interpretar lo que ves. */}
      {stats && (
        <div className="kpis kpis-sticky mb-4">
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


      <Tabs defaultActiveKey="referencias" className="mb-3">
        {/* Lo que se usa a diario va primero: es lo que ve el operador nada más entrar. */}
        <Tab eventKey="referencias" title="Referencias">
          <Card>
            <Card.Body className="p-4">
              {/* Una sola fila: título · buscador (se come el espacio libre) · exportar.
                  Antes el buscador y el botón caían uno debajo del otro porque iban en un bloque
                  aparte con `flex-wrap`, y el buscador tenía un ancho fijo pequeño. */}
              <div className="refs-toolbar mb-3">
                <Card.Title className="mb-0 text-nowrap">Referencias</Card.Title>

                <InputGroup size="sm" className="refs-search">
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

                {/* Exporta LO QUE SE VE: mismos filtros y mismo orden. El Excel lo hace el servidor. */}
                <Button
                  variant="outline-secondary"
                  size="sm"
                  className="text-nowrap"
                  disabled={exportando}
                  onClick={exportar}
                >
                  {exportando ? (
                    <>
                      <Spinner as="span" size="sm" animation="border" className="me-2" /> Exportando…
                    </>
                  ) : (
                    <>
                      <Download className="me-1" aria-hidden="true" />
                      Exportar {maestro.activeFilterCount > 0 || searchAplicada ? 'lo filtrado' : 'todo'} a Excel
                    </>
                  )}
                </Button>
              </div>

              {maestro.loading && (
                <div className="text-secondary small mb-2">
                  <Spinner as="span" size="sm" animation="border" className="me-2" />
                  Cargando…
                </div>
              )}

              {/* Filtra y ordena EN LA BD sobre los 5.736 SKU, no sobre las 100 filas de la página. */}
              <DataTable
                model={maestro}
                allRows={maestro.rows}
                rowKey={(r) => r.sku}
                empty="Ninguna referencia cumple el filtro."
              />
            </Card.Body>
          </Card>
        </Tab>

        {/* Las cargas reescriben la fuente de verdad: sólo admin, y fuera del camino diario. */}
        {isAdmin && (
          <Tab eventKey="cargas" title="Cargas y actualizaciones">
            <Card className="mb-4">
              <Card.Body className="p-4">
                <Card.Title className="mb-1">Cargar maestro completo</Card.Title>
                <p className="text-secondary small">
                  Sube el Excel <strong>REFERENCIAS COOLWAY.xlsx</strong> (la colección entera). Se guarda por{' '}
                  <strong>ref + talla</strong>: añade lo que falte y actualiza lo existente, sin borrar nada. Es lo que hay que
                  cargar para que la generación de etiquetas pueda usar la base de datos como maestro.
                </p>
                <FileDropzone
                  title="REFERENCIAS COOLWAY.xlsx"
                  hint="El maestro completo de la colección"
                  accept=".xlsx,.xlsm"
                  files={masterFile}
                  onFiles={setMasterFile}
                  icon={<Database />}
                />
                <Button className="btn-brand mt-3" disabled={seeding || masterFile.length === 0} onClick={runSeed}>
                  {seeding ? (
                    <>
                      <Spinner as="span" size="sm" animation="border" className="me-2" /> Cargando maestro…
                    </>
                  ) : (
                    <>
                      <Upload className="me-2" aria-hidden="true" /> Cargar maestro
                    </>
                  )}
                </Button>

                {seedReport && (
                  <>
                    <div className={`summary ${seedReport.failed ? 'warn' : 'ok'} mt-3`}>
                      {seedReport.valid.toLocaleString('es-ES')} filas válidas de {seedReport.rows.toLocaleString('es-ES')} leídas ·{' '}
                      {seedReport.created.toLocaleString('es-ES')} nuevas · {seedReport.updated.toLocaleString('es-ES')} actualizadas
                      {seedReport.failed ? ` · ${seedReport.failed} rechazadas` : ''} ·{' '}
                      <strong>{seedReport.total.toLocaleString('es-ES')} SKU en el maestro</strong>
                    </div>

                    {seedReport.colorWebProtegidas > 0 && (
                      <div className="small text-secondary mt-2">
                        <strong>{seedReport.colorWebProtegidas.toLocaleString('es-ES')}</strong> fila
                        {seedReport.colorWebProtegidas > 1 ? 's' : ''} conservaron su <strong>«color web» editado a mano</strong>:
                        el Excel traía otro valor, pero la edición manual manda (REQ-009).
                      </div>
                    )}

                    {seedReport.removed.length > 0 && (
                      <div className="conversion-box mt-2">
                        <div className="small text-secondary mb-2">
                          <strong>
                            {seedReport.removed.length} fila{seedReport.removed.length > 1 ? 's' : ''} retirada
                            {seedReport.removed.length > 1 ? 's' : ''} del maestro
                          </strong>{' '}
                          porque ya no están en el Excel (su modelo y color sí vienen). Es lo que pasa al{' '}
                          <strong>corregir una talla</strong>: la fila con la talla vieja se retira para que no compita
                          con la corregida. Se listan para que puedas comprobarlo.
                        </div>
                        <TablaBorradas removed={seedReport.removed} />
                      </div>
                    )}

                    {seedReport.issues.length > 0 && (
                      <div className="missing-box mt-2">
                        <div className="small text-secondary mb-2">
                          Estas filas del Excel <strong>no han entrado</strong> en el maestro. Son tallas que faltarán al generar
                          etiquetas: hay que corregirlas en el Excel y volver a cargarlo.
                        </div>
                        <TablaRechazadas issues={seedReport.issues} />
                      </div>
                    )}

                    {seedReport.sharedEan13.length > 0 && (
                      <div className="missing-box mt-2">
                        <div className="small text-secondary mb-2">
                          <strong>{seedReport.sharedEan13.length} códigos EAN13 están repetidos en productos distintos.</strong>{' '}
                          Estas filas <strong>sí han entrado</strong> en el maestro, pero el mismo código de barras identifica a
                          dos productos que se venden por separado: en caja sería ambiguo. Hay que corregirlo en el Excel.
                        </div>
                        <TablaEanCompartidos shared={seedReport.sharedEan13} />
                      </div>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>

            <Card className="mb-4">
              <Card.Body className="p-4">
                <Card.Title className="mb-1">Actualizar códigos (prepedidos)</Card.Title>
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
          </Tab>
        )}
      </Tabs>
    </div>
  );
}
