import { Fragment, useState } from 'react';
import { Badge, Button, Card, Collapse, Table } from 'react-bootstrap';
import { CheckCircleFill, ChevronDown, ChevronRight, Download, ExclamationTriangleFill } from 'react-bootstrap-icons';
import type { GeneratedFileDto, MissingCodeDto } from '@yorga/contracts';

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
  const totalOrder = files.reduce((s, f) => s + f.reconciliation.orderPairs, 0);
  const totalMissing = files.reduce((s, f) => s + f.missing.length, 0);
  const allOk = files.every((f) => f.reconciliation.balanced && f.missing.length === 0);

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

        <div className={`summary ${allOk ? 'ok' : 'warn'} mb-3`}>
          {allOk ? <CheckCircleFill className="me-2" /> : <ExclamationTriangleFill className="me-2" />}
          {files.length} pedido{files.length > 1 ? 's' : ''} ·{' '}
          {allOk ? (
            <>{totalGen} pares · todo cuadra y con códigos completos</>
          ) : (
            <>
              {totalGen} de {totalOrder} pares generados · {totalMissing} código{totalMissing !== 1 ? 's' : ''} sin
              encontrar en el maestro
            </>
          )}
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
                      {f.missing.length > 0 && (
                        <Button variant="link" size="sm" className="p-0 text-secondary" onClick={() => toggle(f.orderNumber)}>
                          {isOpen ? <ChevronDown /> : <ChevronRight />}
                        </Button>
                      )}
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
                    <td className="text-end">
                      <Button variant={ok ? 'outline-success' : 'outline-warning'} size="sm" onClick={() => onDownloadOne(f)}>
                        <Download className="me-1" /> Descargar
                      </Button>
                    </td>
                  </tr>
                  {f.missing.length > 0 && (
                    <tr className="missing-row">
                      <td></td>
                      <td colSpan={5} className="pt-0">
                        <Collapse in={isOpen}>
                          <div>
                            <div className="missing-box">
                              <div className="small text-secondary mb-2">
                                Códigos que no están en el maestro (no se inventan — hay que añadirlos al maestro):
                              </div>
                              {groupMissing(f.missing).map((g) => (
                                <div key={g.label} className="small">
                                  <strong>{g.label}</strong> · tallas {g.sizes}
                                </div>
                              ))}
                            </div>
                          </div>
                        </Collapse>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
