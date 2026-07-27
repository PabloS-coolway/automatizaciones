import { useEffect, useState } from 'react';
import { Alert, Badge, Card, Spinner } from 'react-bootstrap';
import { ESTADO_JORNADA_LABELS, type PanelFichajeDto } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';
import { formatearMinutos } from '../../../domain/fichaje-csv';

const VARIANTE_ESTADO: Record<string, string> = { TRABAJANDO: 'success', EN_PAUSA: 'warning' };

/**
 * REQ-008 Fase 2 (Slice 2) · Cuadro de mando de fichajes, acotado a la rama que ve el usuario: quién está
 * fichado **ahora** y qué **jornadas quedaron sin cerrar** (últimos 7 días) — las incidencias a revisar.
 */
export function PanelFichajes() {
  const [panel, setPanel] = useState<PanelFichajeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    rrhhGateway
      .panelFichajes()
      .then(setPanel)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner animation="border" size="sm" />;
  if (error) return <Alert variant="danger">⚠ {error}</Alert>;
  if (!panel) return null;

  return (
    <div className="row g-4">
      <div className="col-12 col-lg-6">
        <Card>
          <Card.Body>
            <Card.Title className="h6 mb-3">Fichados ahora ({panel.ahora.length})</Card.Title>
            {panel.ahora.length === 0 ? (
              <p className="text-secondary small mb-0">Nadie de tu equipo está fichado ahora mismo.</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {panel.ahora.map((a) => (
                  <li key={a.employeeId} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                    <span>
                      {a.fullName}{' '}
                      <Badge bg={`${VARIANTE_ESTADO[a.estado]}-subtle`} text={VARIANTE_ESTADO[a.estado]}>
                        {ESTADO_JORNADA_LABELS[a.estado]}
                      </Badge>
                    </span>
                    <span className="text-secondary">{formatearMinutos(a.minutosTrabajados)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>
      </div>

      <div className="col-12 col-lg-6">
        <Card border={panel.incidencias.length > 0 ? 'warning' : undefined}>
          <Card.Body>
            <Card.Title className="h6 mb-3">Jornadas sin cerrar ({panel.incidencias.length})</Card.Title>
            {panel.incidencias.length === 0 ? (
              <p className="text-secondary small mb-0">Sin incidencias en los últimos 7 días. 👌</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {panel.incidencias.map((i) => (
                  <li key={`${i.employeeId}-${i.fecha}`} className="d-flex justify-content-between py-1 border-bottom">
                    <span>{i.fullName}</span>
                    <span className="text-secondary">{i.fecha}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
