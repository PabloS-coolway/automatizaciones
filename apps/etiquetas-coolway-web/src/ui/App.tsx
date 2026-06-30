import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { EtiquetasPage } from './pages/EtiquetasPage';
import { ComingSoonPage } from './pages/ComingSoonPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/etiquetas" replace />} />
          <Route path="/etiquetas" element={<EtiquetasPage />} />
          <Route path="/maestro" element={<ComingSoonPage title="Base de datos / Maestro" />} />
          <Route path="/tarifas" element={<ComingSoonPage title="Tarifas y surtidos" />} />
          <Route path="/plantillas" element={<ComingSoonPage title="Plantillas de ventas" />} />
          <Route path="*" element={<Navigate to="/etiquetas" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
