import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { Bell, BellFill } from 'react-bootstrap-icons';
import { Link } from 'react-router-dom';
import type { NotificacionDto } from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { useRrhh } from '../rrhh/RrhhContext';

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/**
 * Campana de avisos: badge con no leídas + desplegable con los últimos. Sólo para empleados (los avisos son
 * del módulo de personal). Marca leído al pulsar un aviso y refresca el contador.
 */
export function NotificacionesBell() {
  const { esEmpleado, avisosNoLeidos, refrescarAvisos } = useRrhh();
  const [avisos, setAvisos] = useState<NotificacionDto[]>([]);

  if (!esEmpleado) return null;

  async function abrir(open: boolean) {
    if (!open) return;
    try {
      setAvisos(await rrhhGateway.notificaciones());
    } catch {
      setAvisos([]);
    }
  }

  async function pulsar(a: NotificacionDto) {
    if (!a.read) {
      await rrhhGateway.leerAviso(a.id);
      refrescarAvisos();
      setAvisos((prev) => prev.map((x) => (x.id === a.id ? { ...x, read: true } : x)));
    }
  }

  async function marcarTodas() {
    await rrhhGateway.leerTodosAvisos();
    refrescarAvisos();
    setAvisos((prev) => prev.map((x) => ({ ...x, read: true })));
  }

  return (
    <Dropdown align="end" className="notif-bell" onToggle={abrir}>
      <Dropdown.Toggle as="button" className="notif-bell-btn" aria-label="Avisos">
        {avisosNoLeidos > 0 ? <BellFill /> : <Bell />}
        {avisosNoLeidos > 0 && <span className="notif-bell-badge">{avisosNoLeidos > 9 ? '9+' : avisosNoLeidos}</span>}
      </Dropdown.Toggle>
      <Dropdown.Menu className="notif-bell-menu shadow">
        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
          <strong className="small">Avisos</strong>
          {avisos.some((a) => !a.read) && (
            <button className="btn btn-link btn-sm p-0" onClick={marcarTodas}>Marcar todas</button>
          )}
        </div>
        {avisos.length === 0 ? (
          <div className="px-3 py-3 text-secondary small">No tienes avisos.</div>
        ) : (
          avisos.slice(0, 8).map((a) => (
            <button key={a.id} className={`notif-item ${a.read ? 'text-secondary' : ''}`} onClick={() => pulsar(a)}>
              <div className="small">{!a.read && <span className="notif-dot" />}{a.message}</div>
              <div className="notif-time">{cuando(a.createdAt)}</div>
            </button>
          ))
        )}
        <Link to="/avisos" className="d-block text-center small py-2 border-top text-decoration-none">Ver todos</Link>
      </Dropdown.Menu>
    </Dropdown>
  );
}
