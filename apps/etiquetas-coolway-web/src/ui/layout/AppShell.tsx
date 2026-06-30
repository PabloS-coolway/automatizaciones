import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

/** Marco de la app: sidebar fijo + área de contenido (las páginas se renderizan en el Outlet). */
export function AppShell() {
  return (
    <div className="shell">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
