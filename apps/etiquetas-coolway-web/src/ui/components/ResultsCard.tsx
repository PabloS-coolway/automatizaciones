import { Badge, Button, Card, Table } from 'react-bootstrap';
import type { GeneratedFileDto } from '@yorga/contracts';

interface Props {
  files: GeneratedFileDto[];
  onDownloadOne: (f: GeneratedFileDto) => void;
  onDownloadAll: () => void;
}

export function ResultsCard({ files, onDownloadOne, onDownloadAll }: Props) {
  if (files.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Card.Title className="mb-0">Resultados</Card.Title>
          {files.length > 1 && (
            <Button variant="outline-success" size="sm" onClick={onDownloadAll}>
              Descargar todo ({files.length})
            </Button>
          )}
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
                      <Badge bg="success">✔ cuadra</Badge>
                    ) : (
                      <Badge bg="danger">desfase {f.reconciliation.diff}</Badge>
                    )}
                  </td>
                  <td>
                    {f.missing.length ? <Badge bg="warning" text="dark">{f.missing.length}</Badge> : '—'}
                  </td>
                  <td className="text-end">
                    <Button variant={ok ? 'success' : 'warning'} size="sm" onClick={() => onDownloadOne(f)}>
                      Descargar
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
