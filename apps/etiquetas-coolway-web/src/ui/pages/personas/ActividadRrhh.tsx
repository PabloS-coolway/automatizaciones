import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import {
  RRHH_ACTIVITY_ACTION_LABELS,
  RRHH_ACTIVITY_ENTITIES,
  RRHH_ACTIVITY_ENTITY_LABELS,
  type RrhhActivityDto,
} from '@yorga/contracts';
import { rrhhGateway } from '../../composition';

const VARIANTE: Record<string, string> = { CREATE: 'success', UPDATE: 'primary', DELETE: 'danger' };
const PAGE = 50;

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * REQ-008 · Panel de actividad RRHH: "todo lo que va pasando" (altas/bajas, correcciones de fichaje, ausencias,
 * centros…) con quién y cuándo. Solo lectura, para RRHH/Admin. Filtro por tipo y paginado.
 */
export function ActividadRrhh() {
  const [entries, setEntries] = useState<RrhhActivityDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [entity, setEntity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    rrhhGateway
      .actividadRrhh(page, entity || undefined)
      .then((r) => {
        setEntries(r.entries);
        setTotal(r.total);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [page, entity]);

  useEffect(() => load(), [load]);

  const desde = total === 0 ? 0 : page * PAGE + 1;
  const hasta = Math.min((page + 1) * PAGE, total);

  return (
    <Card>
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
          <Card.Title className="mb-0">Actividad ({total})</Card.Title>
          <Form.Select size="sm" style={{ maxWidth: 220 }} value={entity} onChange={(e) => { setPage(0); setEntity(e.target.value); }}>
            <option value="">Todo</option>
            {RRHH_ACTIVITY_ENTITIES.map((en) => (
              <option key={en} value={en}>{RRHH_ACTIVITY_ENTITY_LABELS[en]}</option>
            ))}
          </Form.Select>
        </div>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

        {loading ? (
          <Spinner animation="border" size="sm" />
        ) : entries.length === 0 ? (
          <p className="text-secondary small mb-0">Sin actividad registrada.</p>
        ) : (
          <ul className="list-unstyled mb-0">
            {entries.map((e) => (
              <li key={e.id} className="d-flex align-items-start gap-2 py-2 border-bottom">
                <Badge bg={`${VARIANTE[e.action] ?? 'secondary'}-subtle`} text={VARIANTE[e.action] ?? 'secondary'} className="flex-shrink-0">
                  {RRHH_ACTIVITY_ACTION_LABELS[e.action] ?? e.action}
                </Badge>
                <span className="flex-grow-1">
                  {e.summary}
                  <span className="text-secondary small"> · {RRHH_ACTIVITY_ENTITY_LABELS[e.entity] ?? e.entity}</span>
                  <div className="text-secondary small">{e.actorEmail} · {cuando(e.createdAt)}</div>
                </span>
              </li>
            ))}
          </ul>
        )}

        {total > PAGE && (
          <div className="d-flex justify-content-between align-items-center mt-3">
            <span className="text-secondary small">{desde}–{hasta} de {total}</span>
            <span className="d-flex gap-2">
              <Button size="sm" variant="outline-secondary" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline-secondary" disabled={hasta >= total} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
            </span>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
