import { NavLink } from 'react-router-dom';
import { BoxSeamFill, CashStack, Database, FileEarmarkText, Tags } from 'react-bootstrap-icons';
import type { ReactNode } from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import type { Theme } from '../useTheme';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  ready?: boolean;
}

const NAV: NavItem[] = [
  { to: '/etiquetas', label: 'Etiquetas', icon: <Tags />, ready: true },
  { to: '/maestro', label: 'Base de datos', icon: <Database /> },
  { to: '/tarifas', label: 'Tarifas y surtidos', icon: <CashStack /> },
  { to: '/plantillas', label: 'Plantillas de ventas', icon: <FileEarmarkText /> },
];

export function Sidebar({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BoxSeamFill className="me-2" />
        <span>Coolway</span>
        <span className="brand-chip">Yorga</span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-ico">{n.icon}</span>
            <span className="nav-label">{n.label}</span>
            {!n.ready && <span className="soon-tag">pronto</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-foot">
        <ThemeSwitcher theme={theme} setTheme={setTheme} />
        <div className="mt-2">Grupo Yorga · Automatizaciones</div>
      </div>
    </aside>
  );
}
