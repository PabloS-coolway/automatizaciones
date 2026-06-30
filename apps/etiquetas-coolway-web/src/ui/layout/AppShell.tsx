import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useTheme } from '../useTheme';

/** Marco de la app: sidebar fijo + área de contenido (las páginas se renderizan en el Outlet). */
export function AppShell() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="shell">
      <Sidebar theme={theme} setTheme={setTheme} />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
