import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import { InicioPage } from './pages/InicioPage';
import { EtiquetasPage } from './pages/EtiquetasPage';
import { BaseDatosPage } from './pages/BaseDatosPage';
import { ComingSoonPage } from './pages/ComingSoonPage';
import { LoginPage } from './pages/LoginPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { RolesPage } from './pages/RolesPage';
import { PodaPage } from './pages/PodaPage';
import { ActividadPage } from './pages/ActividadPage';
import { DestinosPage } from './pages/DestinosPage';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth, RequireFeature } from './auth/RequireAuth';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<RequireAuth />}>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/inicio" replace />} />
              <Route path="/inicio" element={<InicioPage />} />
              <Route path="/etiquetas" element={<EtiquetasPage />} />
              <Route path="/maestro" element={<BaseDatosPage />} />
              <Route path="/plantillas" element={<ComingSoonPage title="Plantillas de ventas" />} />
              <Route element={<RequireFeature feature="usuarios.gestionar" />}>
                <Route path="/usuarios" element={<UsuariosPage />} />
              </Route>
              <Route element={<RequireFeature feature="destinos.gestionar" />}>
                <Route path="/destinos" element={<DestinosPage />} />
              </Route>
              <Route element={<RequireFeature feature="roles.gestionar" />}>
                <Route path="/roles" element={<RolesPage />} />
              </Route>
              <Route element={<RequireFeature feature="maestro.cargar" />}>
                <Route path="/poda" element={<PodaPage />} />
              </Route>
              <Route element={<RequireFeature feature="actividad.ver" />}>
                <Route path="/actividad" element={<ActividadPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/inicio" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
