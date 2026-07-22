import { useEffect, useState, type ReactNode } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  ClockHistory,
  Database,
  GeoAlt,
  People,
  Scissors,
  ShieldLock,
  Tags,
} from 'react-bootstrap-icons';
import type { Feature } from '@yorga/contracts';
import { actividadGateway, gateway, maestroGateway } from '../composition';
import { useAuth } from '../auth/AuthContext';

interface Acceso {
  to: string;
  label: string;
  desc: string;
  icon: ReactNode;
  feature?: Feature;
}

const ACCESOS: Acceso[] = [
  { to: '/etiquetas', label: 'Etiquetas', desc: 'Genera el fichero de etiquetas de un pedido de SAP.', icon: <Tags /> },
  { to: '/maestro', label: 'Base de datos', desc: 'Consulta el maestro de códigos.', icon: <Database /> },
  { to: '/poda', label: 'Podar SAP', desc: 'Deja los ficheros de SAP con solo lo comprado.', icon: <Scissors />, feature: 'maestro.cargar' },
  { to: '/destinos', label: 'Destinos', desc: 'Qué códigos lleva cada destino.', icon: <GeoAlt />, feature: 'destinos.gestionar' },
  { to: '/usuarios', label: 'Usuarios', desc: 'Da de alta y gestiona el acceso.', icon: <People />, feature: 'usuarios.gestionar' },
  { to: '/roles', label: 'Roles', desc: 'Qué puede hacer cada rol.', icon: <ShieldLock />, feature: 'roles.gestionar' },
  { to: '/actividad', label: 'Actividad', desc: 'Quién hizo qué en el sistema.', icon: <ClockHistory />, feature: 'actividad.ver' },
];

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="h-100">
      <Card.Body className="text-center p-4">
        <div className="display-6 fw-bold text-primary">{value}</div>
        <div className="text-secondary">{label}</div>
        {hint && <div className="small text-secondary mt-1">{hint}</div>}
      </Card.Body>
    </Card>
  );
}

/**
 * MEJ-004 · Pantalla de inicio: al entrar, un vistazo (unos números) + accesos rápidos a lo que ese
 * usuario puede usar (según sus permisos). Los KPIs se cargan de endpoints que ya existen; si alguno
 * falla, se muestra "—" en vez de romper la pantalla.
 */
export function InicioPage() {
  const { user, hasFeature } = useAuth();
  const [refs, setRefs] = useState<number | null>(null);
  const [destinos, setDestinos] = useState<number | null>(null);
  const [movs, setMovs] = useState<number | null>(null);

  useEffect(() => {
    maestroGateway.getStats().then((s) => setRefs(s.total)).catch(() => setRefs(null));
    gateway.getMarkets().then((m) => setDestinos(m.length)).catch(() => setDestinos(null));
    if (hasFeature('actividad.ver')) {
      actividadGateway.list(1).then((a) => setMovs(a.total)).catch(() => setMovs(null));
    }
  }, [hasFeature]);

  const accesos = ACCESOS.filter((a) => !a.feature || hasFeature(a.feature));
  const num = (n: number | null) => (n == null ? '—' : n.toLocaleString('es-ES'));

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Hola, {user?.name?.split(' ')[0] ?? ''} 👋</h1>
        <p className="text-secondary mb-0">Este es el panel de Coolway. Desde aquí llegas a todo lo que puedes usar.</p>
      </header>

      <Row className="g-3 mb-4">
        <Col xs={6} md={4}>
          <Kpi label="Referencias en el maestro" value={num(refs)} />
        </Col>
        <Col xs={6} md={4}>
          <Kpi label="Destinos disponibles" value={num(destinos)} />
        </Col>
        {hasFeature('actividad.ver') && (
          <Col xs={6} md={4}>
            <Kpi label="Movimientos registrados" value={num(movs)} hint="en el log de actividad" />
          </Col>
        )}
      </Row>

      <h2 className="h6 text-secondary mb-3">Accesos</h2>
      <Row className="g-3">
        {accesos.map((a) => (
          <Col xs={12} sm={6} lg={4} key={a.to}>
            <Card as={Link} to={a.to} className="h-100 text-decoration-none acceso-card">
              <Card.Body className="p-4 d-flex align-items-start gap-3">
                <div className="acceso-ico">{a.icon}</div>
                <div>
                  <div className="fw-semibold">{a.label}</div>
                  <div className="small text-secondary">{a.desc}</div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
