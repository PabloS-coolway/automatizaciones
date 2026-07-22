import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Modal, Spinner } from 'react-bootstrap';
import { Eye } from 'react-bootstrap-icons';
import type { ActivityAction, ActivityEntity, ActivityEntryDto } from '@yorga/contracts';
import { actividadGateway } from '../composition';
import { Column, DataTable, useMemoryTable } from '../components/table';

const ACCION_COLOR: Record<ActivityAction, string> = {
  CREATE: 'success',
  UPDATE: 'primary',
  DELETE: 'danger',
};
const ENTIDAD_LABEL: Record<ActivityEntity, string> = {
  USER: 'Usuario',
  ROLE: 'Rol',
  DESTINATION: 'Destino',
  MASTER_IMPORT: 'Maestro',
};

const fecha = (iso: string) => new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });

/**
 * REQ-007 · Log de actividad (auditoría). Quién hizo qué: crear/editar de usuarios, roles y destinos, y las
 * cargas del maestro. Sólo lo ve quien tenga `actividad.ver`. El detalle (antes→después) se abre en un modal.
 */
export function ActividadPage() {
  const [entries, setEntries] = useState<ActivityEntryDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detalle, setDetalle] = useState<ActivityEntryDto | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    actividadGateway
      .list()
      .then((r) => setEntries(r.entries))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const columns = useMemo<Column<ActivityEntryDto>[]>(
    () => [
      { key: 'createdAt', label: 'fecha', value: (e) => e.createdAt, render: (e) => <span className="text-nowrap">{fecha(e.createdAt)}</span> },
      { key: 'actorEmail', label: 'usuario', value: (e) => e.actorEmail },
      {
        key: 'action',
        label: 'acción',
        value: (e) => e.action,
        render: (e) => <Badge bg={`${ACCION_COLOR[e.action]}-subtle`} text={ACCION_COLOR[e.action]}>{e.action}</Badge>,
      },
      { key: 'entity', label: 'qué', value: (e) => ENTIDAD_LABEL[e.entity] },
      { key: 'summary', label: 'resumen', value: (e) => e.summary },
      {
        key: 'detalle',
        label: 'detalle',
        align: 'end',
        sortable: false,
        filter: 'none',
        value: () => '',
        render: (e) =>
          e.before || e.after ? (
            <Button size="sm" variant="outline-secondary" onClick={() => setDetalle(e)} aria-label={`Ver detalle de la acción #${e.id}`}>
              <Eye className="me-1" /> ver
            </Button>
          ) : (
            <span className="text-secondary">—</span>
          ),
      },
    ],
    [],
  );

  const tabla = useMemoryTable(entries, columns);

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Actividad</h1>
        <p className="text-secondary mb-0">
          Quién hizo qué: altas y cambios de usuarios, roles y destinos, y las cargas del maestro. El registro
          no se puede editar ni borrar.
        </p>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

      <Card>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title className="mb-0">Movimientos ({entries.length})</Card.Title>
            {loading && <Spinner as="span" size="sm" animation="border" />}
          </div>
          <DataTable model={tabla} allRows={entries} rowKey={(e) => String(e.id)} empty="Sin actividad registrada." />
        </Card.Body>
      </Card>

      <Modal show={!!detalle} onHide={() => setDetalle(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="h6">
            {detalle && (
              <>
                {detalle.action} · {ENTIDAD_LABEL[detalle.entity]} #{detalle.entityId} — {detalle.actorEmail} · {fecha(detalle.createdAt)}
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="text-secondary">{detalle?.summary}</p>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="small fw-semibold mb-1">Antes</div>
              <pre className="detail-panel small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {detalle?.before ? JSON.stringify(detalle.before, null, 2) : '—'}
              </pre>
            </div>
            <div className="col-md-6">
              <div className="small fw-semibold mb-1">Después</div>
              <pre className="detail-panel small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {detalle?.after ? JSON.stringify(detalle.after, null, 2) : '—'}
              </pre>
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </div>
  );
}
