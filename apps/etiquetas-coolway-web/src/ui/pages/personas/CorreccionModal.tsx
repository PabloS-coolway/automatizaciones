import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { GeoAlt } from 'react-bootstrap-icons';
import { MARCAJE_LABELS, MARCAJES, type DiaDetalleFichajeDto, type Marcaje } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';
import { formatearMinutos } from '../../../domain/fichaje-csv';

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/**
 * REQ-008 Fase 2 (Slice 2b) · Corrección de la jornada de un empleado (solo RRHH). Append-only: se **anula** un
 * marcaje erróneo (queda tachado, no se borra) o se **añade** uno que faltó. Todo queda con traza.
 */
export function CorreccionModal({
  employeeId,
  fullName,
  fecha,
  onClose,
  onCorregido,
}: {
  employeeId: number;
  fullName: string;
  fecha: string;
  onClose: () => void;
  onCorregido: () => void;
}) {
  const [dia, setDia] = useState<DiaDetalleFichajeDto | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nuevoKind, setNuevoKind] = useState<Marcaje>('OUT');
  const [nuevaHora, setNuevaHora] = useState('17:00');

  const cargar = () => {
    rrhhGateway
      .diaEmpleado(employeeId, fecha)
      .then(setDia)
      .catch((e) => setError((e as Error).message));
  };

  useEffect(cargar, [employeeId, fecha]);

  async function anular(id: number) {
    if (!confirm('¿Anular este marcaje? Quedará tachado (no se borra) y dejará traza.')) return;
    setBusy(true);
    setError('');
    try {
      setDia(await rrhhGateway.corregirFichaje(employeeId, { action: 'VOID', targetId: id }));
      onCorregido();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function anadir(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const at = new Date(`${fecha}T${nuevaHora}:00`).toISOString();
      setDia(await rrhhGateway.corregirFichaje(employeeId, { action: 'ADD', kind: nuevoKind, at }));
      onCorregido();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal show onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="h5">
          Corregir jornada · {fullName} · {fecha}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" className="py-2">⚠ {error}</Alert>}
        {!dia ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <>
            <p className="text-secondary small">
              Trabajado ese día: <strong>{formatearMinutos(dia.minutosTrabajados)}</strong>. Anular o añadir deja
              traza en el registro de actividad; nada se borra.
            </p>
            <ul className="list-unstyled mb-4">
              {dia.entradas.length === 0 && <li className="text-secondary small">Sin marcajes ese día.</li>}
              {dia.entradas.map((e) => {
                const esVoid = e.kind === 'VOID';
                return (
                  <li key={e.id} className="d-flex align-items-center gap-2 py-1 border-bottom">
                    <span className={`flex-grow-1 ${e.anulado ? 'text-decoration-line-through text-secondary' : ''}`}>
                      {esVoid ? <em className="text-secondary">anulación</em> : MARCAJE_LABELS[e.kind as Marcaje]} · {hora(e.at)}
                      {e.actorEmail && <Badge bg="info-subtle" text="info" className="ms-2">corrección</Badge>}
                      {e.anulado && <Badge bg="secondary-subtle" text="secondary" className="ms-2">anulado</Badge>}
                      {e.latitude != null && e.longitude != null && (
                        <a className="ms-2 small" href={`https://www.google.com/maps?q=${e.latitude},${e.longitude}`} target="_blank" rel="noreferrer">
                          <GeoAlt /> ubicación{e.accuracy != null ? ` (±${Math.round(e.accuracy)}m)` : ''}
                        </a>
                      )}
                    </span>
                    {!esVoid && !e.anulado && (
                      <Button size="sm" variant="outline-danger" onClick={() => anular(e.id)} disabled={busy}>
                        Anular
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>

            <Form onSubmit={anadir} className="d-flex align-items-end gap-2">
              <div>
                <Form.Label className="small mb-1">Añadir marcaje</Form.Label>
                <Form.Select value={nuevoKind} onChange={(ev) => setNuevoKind(ev.target.value as Marcaje)} size="sm">
                  {MARCAJES.map((m) => (
                    <option key={m} value={m}>{MARCAJE_LABELS[m]}</option>
                  ))}
                </Form.Select>
              </div>
              <div>
                <Form.Label className="small mb-1">Hora</Form.Label>
                <Form.Control type="time" value={nuevaHora} onChange={(ev) => setNuevaHora(ev.target.value)} size="sm" required />
              </div>
              <Button size="sm" type="submit" className="btn-brand" disabled={busy}>
                {busy ? <Spinner as="span" size="sm" animation="border" /> : 'Añadir'}
              </Button>
            </Form>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
}
