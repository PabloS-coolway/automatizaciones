import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Spinner } from 'react-bootstrap';
import { CheckAll } from 'react-bootstrap-icons';
import type { NotificacionDto } from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { useRrhh } from '../rrhh/RrhhContext';

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** REQ-008 Fase 4 · Avisos in-app del empleado (nuevas solicitudes a aprobar, decisiones de sus ausencias…). */
export function AvisosPage() {
  const { employee, loading: rrhhLoading, refrescarAvisos } = useRrhh();
  const [avisos, setAvisos] = useState<NotificacionDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!employee) {
      setLoading(false);
      return;
    }
    setLoading(true);
    rrhhGateway.notificaciones().then(setAvisos).catch(() => setAvisos([])).finally(() => setLoading(false));
  }, [employee]);

  useEffect(() => load(), [load]);

  async function marcar(id: number) {
    await rrhhGateway.leerAviso(id);
    load();
    refrescarAvisos();
  }

  async function marcarTodas() {
    await rrhhGateway.leerTodosAvisos();
    load();
    refrescarAvisos();
  }

  if (rrhhLoading || loading) {
    return <div className="page"><Spinner animation="border" size="sm" className="me-2" /> Cargando…</div>;
  }
  if (!employee) {
    return <div className="page"><Alert variant="light" className="border">No tienes ficha de empleado.</Alert></div>;
  }

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <header className="page-head mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h1 className="h4 mb-1">Avisos</h1>
          <p className="text-secondary mb-0">Notificaciones del módulo de personal.</p>
        </div>
        {avisos.some((a) => !a.read) && (
          <Button size="sm" variant="outline-secondary" onClick={marcarTodas}><CheckAll className="me-1" /> Marcar todas</Button>
        )}
      </header>

      {avisos.length === 0 ? (
        <Alert variant="light" className="border">No tienes avisos.</Alert>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <ul className="list-unstyled mb-0">
              {avisos.map((a) => (
                <li key={a.id} className={`d-flex justify-content-between align-items-start gap-3 p-3 border-bottom ${a.read ? 'text-secondary' : ''}`}>
                  <span>
                    {!a.read && <span className="org-dot me-2 d-inline-block" aria-hidden />}
                    {a.message}
                    <div className="small text-secondary">{cuando(a.createdAt)}</div>
                  </span>
                  {!a.read && <Button size="sm" variant="link" className="p-0" onClick={() => marcar(a.id)}>marcar leída</Button>}
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
