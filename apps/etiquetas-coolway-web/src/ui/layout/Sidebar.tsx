import { NavLink } from 'react-router-dom';
import {
  BoxArrowRight,
  BoxSeamFill,
  ClockHistory,
  Database,
  FileEarmarkText,
  GeoAlt,
  HouseDoorFill,
  People,
  PersonCircle,
  Scissors,
  ShieldLock,
  Tags,
} from 'react-bootstrap-icons';
import type { ReactNode } from 'react';
import type { Feature } from '@yorga/contracts';
import { Button } from 'react-bootstrap';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { Theme } from '../useTheme';
import { useAuth } from '../auth/AuthContext';
import { useRrhh } from '../rrhh/RrhhContext';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  ready?: boolean;
  /** REQ-006 · Si se declara, la entrada sólo se ve con esa feature. */
  feature?: Feature;
  /** REQ-008 · Si es true, la entrada sólo se ve si el usuario tiene ficha de empleado (módulo RRHH). */
  soloEmpleados?: boolean;
}

/** MEJ-003 · La navegación se agrupa por módulos (antes era plana). Un grupo sin título va suelto. */
interface NavGroup {
  title?: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { items: [{ to: '/inicio', label: 'Inicio', icon: <HouseDoorFill />, ready: true }] },
  {
    title: 'Etiquetas y colección',
    items: [
      { to: '/etiquetas', label: 'Etiquetas', icon: <Tags />, ready: true },
      { to: '/maestro', label: 'Base de datos', icon: <Database />, ready: true },
      { to: '/poda', label: 'Podar SAP', icon: <Scissors />, ready: true, feature: 'maestro.cargar' },
      { to: '/surtidos', label: 'Surtidos', icon: <BoxSeamFill />, ready: true, feature: 'maestro.cargar' },
      { to: '/destinos', label: 'Destinos', icon: <GeoAlt />, ready: true, feature: 'destinos.gestionar' },
    ],
  },
  {
    title: 'Personas',
    items: [
      { to: '/fichar', label: 'Fichar', icon: <ClockHistory />, ready: true, soloEmpleados: true },
      { to: '/personas', label: 'Personas', icon: <PersonCircle />, ready: true, soloEmpleados: true },
    ],
  },
  {
    title: 'Administración',
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: <People />, ready: true, feature: 'usuarios.gestionar' },
      { to: '/roles', label: 'Roles', icon: <ShieldLock />, ready: true, feature: 'roles.gestionar' },
      { to: '/actividad', label: 'Actividad', icon: <ClockHistory />, ready: true, feature: 'actividad.ver' },
    ],
  },
  {
    title: 'Próximamente',
    items: [{ to: '/plantillas', label: 'Plantillas de ventas', icon: <FileEarmarkText /> }],
  },
];

export function Sidebar({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const { user, logout, hasFeature } = useAuth();
  const { esEmpleado } = useRrhh();
  const visibles = (items: NavItem[]) =>
    items.filter((n) => (!n.feature || hasFeature(n.feature)) && (!n.soloEmpleados || esEmpleado));

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BoxSeamFill className="me-2" />
        <span>Coolway</span>
        <span className="brand-chip">Yorga</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((grupo, i) => {
          const items = visibles(grupo.items);
          if (items.length === 0) return null; // grupo sin nada visible → no se pinta
          return (
            <div key={grupo.title ?? `grupo-${i}`} className="nav-group">
              {grupo.title && <div className="nav-group-title">{grupo.title}</div>}
              {items.map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                  <span className="nav-ico">{n.icon}</span>
                  <span className="nav-label">{n.label}</span>
                  {!n.ready && <span className="soon-tag">pronto</span>}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-foot">
        {user && (
          <div className="sidebar-user">
            <PersonCircle className="sidebar-user-ico" />
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.name}</div>
              <div className="sidebar-user-role">{user.role}</div>
            </div>
            <Button
              variant="link"
              size="sm"
              className="sidebar-logout"
              onClick={logout}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
            >
              <BoxArrowRight />
            </Button>
          </div>
        )}
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
        <div className="mt-2">Grupo Yorga · Automatizaciones</div>
      </div>
    </aside>
  );
}
