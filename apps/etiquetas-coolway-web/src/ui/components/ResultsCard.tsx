import { Fragment, useState } from 'react';
import { Alert, Badge, Button, Card, Collapse, Table } from 'react-bootstrap';
import { CheckCircleFill, ChevronDown, ChevronRight, Download, Eye } from 'react-bootstrap-icons';
import type { GeneratedFileDto, MissingCodeDto } from '@yorga/contracts';
import { LabelsTable } from './LabelsTable';

interface Props {
  files: GeneratedFileDto[];
  onDownloadOne: (f: GeneratedFileDto) => void;
  onDownloadAll: () => void;
}

/** Agrupa los códigos faltantes por modelo+color → lista de tallas. */
function groupMissing(missing: MissingCodeDto[]): { label: string; sizes: string }[] {
  const map = new Map<string, string[]>();
  for (const m of missing) {
    const key = `${m.style} ${m.color}`;
    (map.get(key) ?? map.set(key, []).get(key)!).push(m.size);
  }
  return [...map.entries()].map(([label, sizes]) => ({ label, sizes: sizes.join(', ') }));
}

export function ResultsCard({ files, onDownloadOne, onDownloadAll }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  if (files.length === 0) return null;

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const totalGen = files.reduce((s, f) => s + f.reconciliation.labelPairs, 0);
  const totalMissing = files.reduce((s, f) => s + f.missing.length, 0);
  const okCount = files.filter((f) => f.reconciliation.balanced && f.missing.length === 0).length;

  return (
    <Card>
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Card.Title className="mb-0">Resultados</Card.Title>
          {files.length > 1 && (
            <Button className="btn-brand btn-sm" onClick={onDownloadAll}>
              <Download className="me-2" />
              Descargar todo ({files.length})
            </Button>
          )}
        </div>

        <div className="kpis mb-4">
          <div className="kpi">
            <div className="kpi-val">{files.length}</div>
            <div className="kpi-lbl">Pedidos</div>
          </div>
          <div className="kpi">
            <div className="kpi-val">{totalGen.toLocaleString('es-ES')}</div>
            <div className="kpi-lbl">Pares generados</div>
          </div>
          <div className={`kpi ${totalMissing ? 'kpi-warn' : ''}`}>
            <div className="kpi-val">{totalMissing}</div>
            <div className="kpi-lbl">Códigos faltantes</div>
          </div>
          <div className={`kpi ${okCount === files.length ? 'kpi-ok' : 'kpi-warn'}`}>
            <div className="kpi-val">
              {okCount}/{files.length}
            </div>
            <div className="kpi-lbl">Pedidos que cuadran</div>
          </div>
        </div>

        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Pedido</th>
              <th>Pares</th>
              <th>Cuadre</th>
              <th>Faltantes</th>
              <th className="text-end">Fichero</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => {
              const ok = f.reconciliation.balanced && f.missing.length === 0;
              const isOpen = expanded.has(f.orderNumber);
              return (
                <Fragment key={f.orderNumber}>
                  <tr>
                    <td>
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 text-secondary"
                        onClick={() => toggle(f.orderNumber)}
                        aria-label={isOpen ? `Ocultar detalle del pedido ${f.orderNumber}` : `Ver detalle del pedido ${f.orderNumber}`}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                      </Button>
                    </td>
                    <td className="fw-semibold">{f.orderNumber}</td>
                    <td>
                      {f.reconciliation.labelPairs}
                      {!f.reconciliation.balanced && (
                        <span className="text-secondary"> / {f.reconciliation.orderPairs}</span>
                      )}
                    </td>
                    <td>
                      {f.reconciliation.balanced ? (
                        <Badge bg="success-subtle" text="success">
                          <CheckCircleFill className="me-1" /> cuadra
                        </Badge>
                      ) : (
                        <Badge bg="danger-subtle" text="danger">
                          faltan {Math.abs(f.reconciliation.diff)}
                        </Badge>
                      )}
                    </td>
                    <td>
                      {f.missing.length ? (
                        <Badge bg="warning-subtle" text="warning" role="button" onClick={() => toggle(f.orderNumber)}>
                          {f.missing.length} ver
                        </Badge>
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
                    </td>
                    <td className="text-end text-nowrap">
                      <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => toggle(f.orderNumber)}>
                        <Eye className="me-1" /> {isOpen ? 'Ocultar' : 'Ver en línea'}
                      </Button>
                      <Button variant={ok ? 'outline-success' : 'outline-warning'} size="sm" onClick={() => onDownloadOne(f)}>
                        <Download className="me-1" /> Descargar
                      </Button>
                    </td>
                  </tr>
                  <tr className="detail-row">
                    <td colSpan={6} className="pt-0 pb-0">
                      <Collapse in={isOpen}>
                        <div>
                          <div className="detail-panel">
                            <div className="detail-panel-head">
                              <span className="detail-panel-title">Etiquetas del pedido {f.orderNumber}</span>
                              {ok ? (
                                <Badge bg="success-subtle" text="success">
                                  <CheckCircleFill className="me-1" /> todo correcto
                                </Badge>
                              ) : (
                                <Badge bg="warning-subtle" text="warning">revisar</Badge>
                              )}
                            </div>

                            {(!f.reconciliation.balanced || f.missing.length > 0) && (
                              <Alert variant={!f.reconciliation.balanced ? 'danger' : 'warning'} className="py-2 mb-3 small">
                                {!f.reconciliation.balanced && (
                                  <div>
                                    <strong>No cuadra:</strong> {f.reconciliation.labelPairs} de {f.reconciliation.orderPairs} pares
                                    generados (faltan {Math.abs(f.reconciliation.diff)}).
                                  </div>
                                )}
                                {f.missing.length > 0 && (
                                  <div>
                                    <strong>{f.missing.length} código{f.missing.length > 1 ? 's' : ''}</strong> sin encontrar en el
                                    maestro (detalle abajo).
                                  </div>
                                )}
                              </Alert>
                            )}

                            {f.missing.length > 0 && (
                              <div className="missing-box mb-3">
                                <div className="small text-secondary mb-2">
                                  Códigos que no están en el maestro (no se inventan — hay que añadirlos al maestro):
                                </div>
                                {groupMissing(f.missing).map((g) => (
                                  <div key={g.label} className="small">
                                    <strong>{g.label}</strong> · tallas {g.sizes}
                                  </div>
                                ))}
                              </div>
                            )}
                            <LabelsTable rows={f.rows} fileName={f.fileName} />
                          </div>
                        </div>
                      </Collapse>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
