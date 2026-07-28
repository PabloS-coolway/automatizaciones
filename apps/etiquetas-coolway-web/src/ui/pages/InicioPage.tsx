import { useEffect, useState, type ReactNode } from 'react';
import { Card, Col, Row } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import {
  BoxArrowInRight,
  CalendarCheck,
  ClockHistory,
  Database,
  GeoAlt,
  Gift,
  PersonCircle,
  People,
  Scissors,
  ShieldLock,
  Tags,
} from 'react-bootstrap-icons';
import { ESTADO_AUSENCIA_LABELS, ESTADO_JORNADA_LABELS, type AbsenceDto, type CumpleDto, type Feature, type JornadaHoyDto } from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { useAuth } from '../auth/AuthContext';
import { useRrhh } from '../rrhh/RrhhContext';
import { formatearMinutos } from '../../domain/fichaje-csv';

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

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** "hoy 🎉", "mañana", o "el 1 ago (en 4 días)". */
function cumpleTexto(c: CumpleDto): string {
  if (c.diasHasta === 0) return '¡hoy! 🎉';
  if (c.diasHasta === 1) return 'mañana';
  const [m, d] = c.fecha.split('-');
  return `${Number(d)} ${MESES_CORTOS[Number(m) - 1]} · en ${c.diasHasta} días`;
}

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

  // KPIs de personal (solo para quien gestiona equipo).
  const [activos, setActivos] = useState<number | null>(null);
  const [sinFicha, setSinFicha] = useState<number | null>(null);
  const [fichadosAhora, setFichadosAhora] = useState<number | null>(null);
  const [incidencias, setIncidencias] = useState<number | null>(null);
  const [pendientes, setPendientes] = useState<number | null>(null);
  const [jornada, setJornada] = useState<JornadaHoyDto | null>(null);
  const [cumples, setCumples] = useState<CumpleDto[]>([]);
  const [proximaAusencia, setProximaAusencia] = useState<AbsenceDto | null>(null);

  useEffect(() => {
    if (!esEmpleado) return;
    rrhhGateway.jornadaHoy().then(setJornada).catch(() => setJornada(null));
    rrhhGateway.cumpleanos().then(setCumples).catch(() => setCumples([]));
    const hoy = new Date().toISOString().slice(0, 10);
    rrhhGateway
      .misAusencias()
      .then((as) => setProximaAusencia(as.filter((a) => a.status !== 'REJECTED' && a.status !== 'CANCELLED' && a.endDate >= hoy).sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null))
      .catch(() => setProximaAusencia(null));
  }, [esEmpleado]);

  useEffect(() => {
    if (!gestionaEquipo) return;
    rrhhGateway.listEmpleados().then((e) => setActivos(e.filter((x) => x.active).length)).catch(() => setActivos(null));
    rrhhGateway.usuariosSinFicha().then((u) => setSinFicha(u.length)).catch(() => setSinFicha(null));
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

      {/* Empleado: lo primero, fichar — y si está fichando, se dice. */}
      {esEmpleado && (
        <Card className={`mb-4 ${jornada && jornada.estado !== 'FUERA' ? 'border-success' : 'border-primary-subtle'}`}>
          <Card.Body className="p-4 d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div className="d-flex align-items-center gap-3">
              {jornada && jornada.estado !== 'FUERA' && (
                <span className={`estado-punto ${jornada.estado === 'TRABAJANDO' ? 'trabajando' : 'pausa'}`} aria-hidden />
              )}
              <div>
                <div className="fw-semibold">
                  {jornada && jornada.estado !== 'FUERA'
                    ? <>Estás <span className={jornada.estado === 'TRABAJANDO' ? 'text-success' : 'text-warning'}>{ESTADO_JORNADA_LABELS[jornada.estado].toLowerCase()}</span></>
                    : 'Tu jornada'}
                </div>
                <div className="small text-secondary">
                  {jornada && jornada.estado !== 'FUERA'
                    ? `Llevas ${formatearMinutos(jornada.minutosTrabajados)} trabajados hoy.`
                    : 'Ficha tu entrada/salida o consulta tu historial.'}
                </div>
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <Link to="/fichar" className="btn btn-brand"><BoxArrowInRight className="me-1" /> {jornada && jornada.estado !== 'FUERA' ? 'Ir a fichar' : 'Fichar'}</Link>
              <Link to="/ausencias" className="btn btn-outline-secondary"><CalendarCheck className="me-1" /> Ausencias</Link>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Empleado: cumpleaños del equipo + su próxima ausencia. */}
      {esEmpleado && (cumples.length > 0 || proximaAusencia) && (
        <Row className="g-3 mb-4">
          {cumples.length > 0 && (
            <Col xs={12} md={proximaAusencia ? 7 : 12}>
              <Card className="h-100">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-2 mb-2"><Gift className="text-brand" /> <span className="fw-semibold">Próximos cumpleaños</span></div>
                  <ul className="list-unstyled mb-0">
                    {cumples.slice(0, 5).map((c) => (
                      <li key={c.id} className="d-flex justify-content-between py-1 border-bottom">
                        <span>🎂 {c.fullName} <span className="text-secondary small">({c.edad})</span></span>
                        <span className="text-secondary small">{cumpleTexto(c)}</span>
                      </li>
                    ))}
                  </ul>
                </Card.Body>
              </Card>
            </Col>
          )}
          {proximaAusencia && (
            <Col xs={12} md={cumples.length > 0 ? 5 : 12}>
              <Card className="h-100">
                <Card.Body className="p-4">
                  <div className="d-flex align-items-center gap-2 mb-2"><CalendarCheck className="text-brand" /> <span className="fw-semibold">Tu próxima ausencia</span></div>
                  <div className="mb-1">{proximaAusencia.typeName} · {proximaAusencia.startDate} → {proximaAusencia.endDate}</div>
                  <div className="text-secondary small">{proximaAusencia.dias} día/s · {ESTADO_AUSENCIA_LABELS[proximaAusencia.status]}</div>
                </Card.Body>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* RRHH / Responsable: KPIs de personal (lo que importa). */}
      {gestionaEquipo && (
        <>
          <h2 className="h6 text-secondary mb-3">Personal</h2>
          <Row className="g-3 mb-4">
            <Col xs={6} md><Kpi label="Empleados activos" value={num(activos)} /></Col>
            <Col xs={6} md><Kpi label="Ausencias por aprobar" value={num(pendientes)} /></Col>
            <Col xs={6} md><Kpi label="Usuarios sin ficha" value={num(sinFicha)} hint="por dar de alta" /></Col>
            <Col xs={6} md><Kpi label="Jornadas sin cerrar" value={num(incidencias)} hint="últimos 7 días" /></Col>
            <Col xs={6} md><Kpi label="Fichados ahora" value={num(fichadosAhora)} /></Col>
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
