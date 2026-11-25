import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginView } from './components/LoginView';
import { PanelOperativo } from './components/PanelOperativo';
import { obtenerToken, obtenerUsuario, rutaPorDefectoRol } from './utils/sesion';

function RutaProtegida({ children }: { children: ReactNode }) {
  const token = obtenerToken();
  const usuario = obtenerUsuario();

  if (!token || !usuario) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const usuario = obtenerUsuario();
  const inicio = usuario ? rutaPorDefectoRol(usuario.rol) : '/login';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route
          path="/mesas"
          element={
            <RutaProtegida>
              <PanelOperativo vista="mesas" />
            </RutaProtegida>
          }
        />
        <Route
          path="/cocina"
          element={
            <RutaProtegida>
              <PanelOperativo vista="cocina" />
            </RutaProtegida>
          }
        />
        <Route
          path="/caja"
          element={
            <RutaProtegida>
              <PanelOperativo vista="caja" />
            </RutaProtegida>
          }
        />
        <Route
          path="/admin"
          element={
            <RutaProtegida>
              <PanelOperativo vista="admin" />
            </RutaProtegida>
          }
        />
        <Route path="*" element={<Navigate to={inicio} replace />} />
      </Routes>
    </BrowserRouter>
  );
}