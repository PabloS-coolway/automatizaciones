import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { MARCAJE_LABELS, MARCAJES, type DiaDetalleFichajeDto, type Marcaje } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/**
 * REQ-008 · Auto-edición del PROPIO día (estilo Factorial): el empleado añade el marcaje que le faltó o anula
 * uno erróneo, sobre sus días recientes. Append-only y auditado (igual que una corrección de RRHH). Si el día
 * no es editable (fuera de la ventana), se muestra en solo-lectura.
 */
export function MiDiaModal({ fecha, editable, onClose, onCambiado }: { fecha: string; editable: boolean; onClose: () => void; onCambiado: () => void }) {
  const [dia, setDia] = useState<DiaDetalleFichajeDto | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [nuevoKind, setNuevoKind] = useState<Marcaje>('IN');
  const [nuevaHora, setNuevaHora] = useState('09:00');

  useEffect(() => {
    rrhhGateway.miDia(fecha).then(setDia).catch((e) => setError((e as Error).message));
  }, [fecha]);

  async function anular(id: number) {
    if (!confirm('¿Anular este marcaje? Quedará tachado (no se borra) y dejará traza.')) return;
    setBusy(true);
    setError('');
    try {
      setDia(await rrhhGateway.miCorreccion({ action: 'VOID', targetId: id }));
      onCambiado();
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
      setDia(await rrhhGateway.miCorreccion({ action: 'ADD', kind: nuevoKind, at }));
      onCambiado();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const fechaLabel = new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' });

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="h6 text-capitalize">{fechaLabel}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" className="py-2">⚠ {error}</Alert>}
        {!dia ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <>
            <ul className="list-unstyled mb-3">
              {dia.entradas.length === 0 && <li className="text-secondary small">Sin marcajes ese día.</li>}
              {dia.entradas.map((e) => {
                const esVoid = e.kind === 'VOID';
                return (
                  <li key={e.id} className="d-flex align-items-center gap-2 py-1 border-bottom">
                    <span className={`flex-grow-1 ${e.anulado ? 'text-decoration-line-through text-secondary' : ''}`}>
                      {esVoid ? <em className="text-secondary">anulación</em> : MARCAJE_LABELS[e.kind as Marcaje]} · {hora(e.at)}
                      {e.anulado && <Badge bg="secondary-subtle" text="secondary" className="ms-2">anulado</Badge>}
                    </span>
                    {editable && !esVoid && !e.anulado && (
                      <Button size="sm" variant="outline-danger" onClick={() => anular(e.id)} disabled={busy}>Anular</Button>
                    )}
                  </li>
                );
              })}
            </ul>

            {editable ? (
              <Form onSubmit={anadir} className="d-flex align-items-end gap-2">
                <div>
                  <Form.Label className="small mb-1">Añadir marcaje</Form.Label>
                  <Form.Select value={nuevoKind} onChange={(ev) => setNuevoKind(ev.target.value as Marcaje)} size="sm">
                    {MARCAJES.map((m) => (<option key={m} value={m}>{MARCAJE_LABELS[m]}</option>))}
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
            ) : (
              <p className="text-secondary small mb-0">Este día ya no es editable por ti. Para corregirlo, pídelo a RRHH.</p>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
  );
}
