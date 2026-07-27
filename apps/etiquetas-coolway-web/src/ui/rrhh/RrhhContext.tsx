import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { EmployeeDto } from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { useAuth } from '../auth/AuthContext';

interface RrhhState {
  /** Ficha del usuario que ha entrado, o `null` si no es empleado. */
  employee: EmployeeDto | null;
  loading: boolean;
  /** ¿El usuario tiene ficha de empleado? Es lo que decide si "Personas" aparece en el menú. */
  esEmpleado: boolean;
  /** ¿Puede gestionar la plantilla (RRHH/Admin)? */
  puedeGestionar: boolean;
  refetch: () => void;
}

const RrhhContext = createContext<RrhhState | null>(null);

/**
 * REQ-008 · Contexto del módulo RRHH. Resuelve una sola vez "¿soy empleado y con qué rol?" (`/rrhh/me`) para
 * que el sidebar oculte "Personas" a quien no lo es y las páginas no re-consulten. Se monta dentro del área
 * autenticada (AppShell): sin login no tiene sentido.
 */
export function RrhhProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [employee, setEmployee] = useState<EmployeeDto | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(() => {
    if (!user) {
      setEmployee(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    rrhhGateway
      .me()
      .then((m) => setEmployee(m.employee))
      .catch(() => setEmployee(null))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => refetch(), [refetch]);

  const esEmpleado = employee != null;
  const puedeGestionar = employee?.rrhhRole === 'RRHH' || employee?.rrhhRole === 'ADMIN';

  return (
    <RrhhContext.Provider value={{ employee, loading, esEmpleado, puedeGestionar, refetch }}>{children}</RrhhContext.Provider>
  );
}

export function useRrhh(): RrhhState {
  const ctx = useContext(RrhhContext);
  if (!ctx) throw new Error('useRrhh debe usarse dentro de <RrhhProvider>.');
  return ctx;
}
