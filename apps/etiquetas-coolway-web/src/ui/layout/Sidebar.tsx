import { NavLink } from 'react-router-dom';
import { BoxArrowRight, BoxSeamFill, CashStack, Database, FileEarmarkText, People, PersonCircle, Tags } from 'react-bootstrap-icons';
import type { ReactNode } from 'react';
import { Button } from 'react-bootstrap';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { Theme } from '../useTheme';
import { useAuth } from '../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  ready?: boolean;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/etiquetas', label: 'Etiquetas', icon: <Tags />, ready: true },
  { to: '/maestro', label: 'Base de datos', icon: <Database />, ready: true },
  { to: '/usuarios', label: 'Usuarios', icon: <People />, ready: true, adminOnly: true },
  { to: '/tarifas', label: 'Tarifas y surtidos', icon: <CashStack /> },
  { to: '/plantillas', label: 'Plantillas de ventas', icon: <FileEarmarkText /> },
];

export function Sidebar({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const { user, logout, isAdmin } = useAuth();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BoxSeamFill className="me-2" />
        <span>Coolway</span>
        <span className="brand-chip">Yorga</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.filter((n) => !n.adminOnly || isAdmin).map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-ico">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
            {!n.ready && <span className="soon-tag">pronto</span>}
          </NavLink>
        ))}
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
