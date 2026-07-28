import { useEffect, useState, type ReactNode } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  BoxArrowInRight,
  CalendarCheck,
  ClockHistory,
  Database,
  GeoAlt,
  PersonCircle,
  People,
  Scissors,
  ShieldLock,
  Tags,
} from 'react-bootstrap-icons';
import type { Feature } from '@yorga/contracts';
import { actividadGateway, gateway, maestroGateway, rrhhGateway } from '../composition';
import { useAuth } from '../auth/AuthContext';
import { useRrhh } from '../rrhh/RrhhContext';

interface Acceso {
  to: string;
  label: string;
  desc: string;
  icon: ReactNode;
  feature?: Feature;
  /** Sólo si el usuario tiene ficha de empleado (módulo RRHH). */
  soloEmpleado?: boolean;
}

const ACCESOS: Acceso[] = [
  { to: '/fichar', label: 'Fichar', desc: 'Ficha tu jornada y consulta tu historial.', icon: <ClockHistory />, soloEmpleado: true },
  { to: '/ausencias', label: 'Ausencias', desc: 'Solicita vacaciones y mira su estado.', icon: <CalendarCheck />, soloEmpleado: true },
  { to: '/personas', label: 'Personas', desc: 'Plantilla, organigrama y control.', icon: <PersonCircle />, soloEmpleado: true },
  { to: '/etiquetas', label: 'Etiquetas', desc: 'Genera el fichero de etiquetas de un pedido de SAP.', icon: <Tags />, feature: 'etiquetas.ver' },
  { to: '/maestro', label: 'Base de datos', desc: 'Consulta el maestro de códigos.', icon: <Database />, feature: 'maestro.ver' },
  { to: '/poda', label: 'Podar SAP', desc: 'Deja los ficheros de SAP con solo lo comprado.', icon: <Scissors />, feature: 'maestro.cargar' },
  { to: '/destinos', label: 'Destinos', desc: 'Qué códigos lleva cada destino.', icon: <GeoAlt />, feature: 'destinos.gestionar' },
  { to: '/usuarios', label: 'Usuarios', desc: 'Da de alta y gestiona el acceso.', icon: <People />, feature: 'usuarios.gestionar' },
  { to: '/roles', label: 'Roles', desc: 'Qué puede hacer cada rol.', icon: <ShieldLock />, feature: 'roles.gestionar' },
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
 * Pantalla de inicio **adaptada al rol**:
 * - **Empleado** → lo primero, fichar / ver su jornada; sin KPIs de etiquetas ni maestro.
 * - **RRHH / Responsable** → KPIs de personal (activos, fichados ahora, incidencias, ausencias por aprobar).
 * - **Etiquetas / maestro** → solo para quien tenga esas features (se ocultan al resto).
 */
export function InicioPage() {
  const { user, hasFeature } = useAuth();
  const { employee, esEmpleado } = useRrhh();
  const gestionaEquipo = employee != null && employee.rrhhRole !== 'EMPLEADO';

  // KPIs de etiquetas/maestro (solo con feature).
  const [refs, setRefs] = useState<number | null>(null);
  const [destinos, setDestinos] = useState<number | null>(null);
  const [movs, setMovs] = useState<number | null>(null);
  // KPIs de personal (solo para quien gestiona equipo).
  const [activos, setActivos] = useState<number | null>(null);
  const [fichadosAhora, setFichadosAhora] = useState<number | null>(null);
  const [incidencias, setIncidencias] = useState<number | null>(null);
  const [pendientes, setPendientes] = useState<number | null>(null);

  useEffect(() => {
    if (hasFeature('maestro.ver')) maestroGateway.getStats().then((s) => setRefs(s.total)).catch(() => setRefs(null));
    if (hasFeature('destinos.gestionar')) gateway.getMarkets().then((m) => setDestinos(m.length)).catch(() => setDestinos(null));
    if (hasFeature('actividad.ver')) actividadGateway.list(1).then((a) => setMovs(a.total)).catch(() => setMovs(null));
  }, [hasFeature]);

  useEffect(() => {
    if (!gestionaEquipo) return;
    rrhhGateway.listEmpleados().then((e) => setActivos(e.filter((x) => x.active).length)).catch(() => setActivos(null));
    rrhhGateway.panelFichajes().then((p) => { setFichadosAhora(p.ahora.length); setIncidencias(p.incidencias.length); }).catch(() => { setFichadosAhora(null); setIncidencias(null); });
    rrhhGateway.ausenciasPendientes().then((a) => setPendientes(a.length)).catch(() => setPendientes(null));
  }, [gestionaEquipo]);

  const accesos = ACCESOS.filter((a) => (!a.feature || hasFeature(a.feature)) && (!a.soloEmpleado || esEmpleado));
  const num = (n: number | null) => (n == null ? '—' : n.toLocaleString('es-ES'));

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Hola, {user?.name?.split(' ')[0] ?? ''} 👋</h1>
        <p className="text-secondary mb-0">Este es el panel de Coolway. Desde aquí llegas a todo lo que puedes usar.</p>
      </header>

      {/* Empleado: lo primero, fichar. */}
      {esEmpleado && (
        <Card className="mb-4 border-primary-subtle">
          <Card.Body className="p-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div>
              <div className="fw-semibold">Tu jornada</div>
              <div className="small text-secondary">Ficha tu entrada/salida o consulta tu historial.</div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/fichar" className="btn btn-brand"><BoxArrowInRight className="me-1" /> Fichar</Link>
              <Link to="/ausencias" className="btn btn-outline-secondary"><CalendarCheck className="me-1" /> Ausencias</Link>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* RRHH / Responsable: KPIs de personal. */}
      {gestionaEquipo && (
        <>
          <h2 className="h6 text-secondary mb-3">Personal</h2>
          <Row className="g-3 mb-4">
            <Col xs={6} md={3}><Kpi label="Empleados activos" value={num(activos)} /></Col>
            <Col xs={6} md={3}><Kpi label="Fichados ahora" value={num(fichadosAhora)} /></Col>
            <Col xs={6} md={3}><Kpi label="Jornadas sin cerrar" value={num(incidencias)} hint="últimos 7 días" /></Col>
            <Col xs={6} md={3}><Kpi label="Ausencias por aprobar" value={num(pendientes)} /></Col>
          </Row>
        </>
      )}

      {/* Etiquetas / maestro: solo con feature. */}
      {(hasFeature('maestro.ver') || hasFeature('destinos.gestionar') || hasFeature('actividad.ver')) && (
        <>
          <h2 className="h6 text-secondary mb-3">Colección y maestro</h2>
          <Row className="g-3 mb-4">
            {hasFeature('maestro.ver') && <Col xs={6} md={4}><Kpi label="Referencias en el maestro" value={num(refs)} /></Col>}
            {hasFeature('destinos.gestionar') && <Col xs={6} md={4}><Kpi label="Destinos disponibles" value={num(destinos)} /></Col>}
            {hasFeature('actividad.ver') && <Col xs={6} md={4}><Kpi label="Movimientos registrados" value={num(movs)} hint="en el log de actividad" /></Col>}
          </Row>
        </>
      )}

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
