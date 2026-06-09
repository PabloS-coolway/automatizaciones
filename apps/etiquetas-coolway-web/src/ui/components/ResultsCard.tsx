import { Badge, Button, Card, Table } from 'react-bootstrap';
import { CheckCircleFill, Download, ExclamationTriangleFill } from 'react-bootstrap-icons';
import type { GeneratedFileDto } from '@yorga/contracts';

interface Props {
  files: GeneratedFileDto[];
  onDownloadOne: (f: GeneratedFileDto) => void;
  onDownloadAll: () => void;
}

export function ResultsCard({ files, onDownloadOne, onDownloadAll }: Props) {
  if (files.length === 0) return null;

  const totalPairs = files.reduce((s, f) => s + f.reconciliation.labelPairs, 0);
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
          {files.length} pedido{files.length > 1 ? 's' : ''} · {totalPairs} pares ·{' '}
          {allOk ? 'todo cuadra y con códigos completos' : 'revisa los pedidos marcados'}
        </div>

        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr>
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
              return (
                <tr key={f.orderNumber}>
                  <td className="fw-semibold">{f.orderNumber}</td>
                  <td>{f.reconciliation.labelPairs}</td>
                  <td>
                    {f.reconciliation.balanced ? (
                      <Badge bg="success-subtle" text="success">
                        <CheckCircleFill className="me-1" /> cuadra
                      </Badge>
                    ) : (
                      <Badge bg="danger-subtle" text="danger">
                        desfase {f.reconciliation.diff}
                      </Badge>
                    )}
                  </td>
                  <td>
                    {f.missing.length ? (
                      <Badge bg="warning-subtle" text="warning">
                        {f.missing.length}
                      </Badge>
                    ) : (
                      <span className="text-secondary">—</span>
                    )}
                  </td>
                  <td className="text-end">
                    <Button
                      variant={ok ? 'outline-success' : 'outline-warning'}
                      size="sm"
                      onClick={() => onDownloadOne(f)}
                    >
                      <Download className="me-1" /> Descargar
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}
