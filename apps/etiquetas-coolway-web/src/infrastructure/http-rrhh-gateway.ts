import type {
  CenterDto,
  CreateCenterDto,
  CreateDepartmentDto,
  CreateEmployeeDto,
  DepartmentDto,
  EmployeeDto,
  FicharDto,
  HistoricoFichajeDto,
  JornadaHoyDto,
  PanelFichajeDto,
  RrhhMeDto,
  UpdateCenterDto,
  UpdateDepartmentDto,
  UpdateEmployeeDto,
} from '@yorga/contracts';
import { apiFetch, errorMessage } from './api-client';

/** Adapter: módulo RRHH contra la API HTTP (REQ-008 · Fase 0). */
export class HttpRrhhGateway {
  /** Contexto RRHH del usuario que ha entrado (si es empleado y con qué rol). */
  async me(): Promise<RrhhMeDto> {
    const res = await apiFetch('/rrhh/me');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar tu ficha de RRHH.'));
    return res.json();
  }

  /** La plantilla que el usuario puede ver (según su rol y su rama del organigrama). */
  async listEmpleados(): Promise<EmployeeDto[]> {
    const res = await apiFetch('/rrhh/empleados');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar la plantilla.'));
    return res.json();
  }

  async crearEmpleado(input: CreateEmployeeDto): Promise<EmployeeDto> {
    const res = await apiFetch('/rrhh/empleados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo dar de alta el empleado.'));
    return res.json();
  }

  async editarEmpleado(id: number, input: UpdateEmployeeDto): Promise<EmployeeDto> {
    const res = await apiFetch(`/rrhh/empleados/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo guardar la ficha.'));
    return res.json();
  }

  async darDeBaja(id: number): Promise<EmployeeDto> {
    const res = await apiFetch(`/rrhh/empleados/${id}/baja`, { method: 'POST' });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo dar de baja al empleado.'));
    return res.json();
  }

  async reactivar(id: number): Promise<EmployeeDto> {
    const res = await apiFetch(`/rrhh/empleados/${id}/reactivar`, { method: 'POST' });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo reactivar al empleado.'));
    return res.json();
  }

  // ---- Estructura: centros (multimarca) y departamentos ----

  async listCentros(): Promise<CenterDto[]> {
    const res = await apiFetch('/rrhh/centros');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los centros.'));
    return res.json();
  }

  async crearCentro(input: CreateCenterDto): Promise<CenterDto> {
    const res = await apiFetch('/rrhh/centros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo crear el centro.'));
    return res.json();
  }

  async editarCentro(id: number, input: UpdateCenterDto): Promise<CenterDto> {
    const res = await apiFetch(`/rrhh/centros/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo guardar el centro.'));
    return res.json();
  }

  async borrarCentro(id: number): Promise<void> {
    const res = await apiFetch(`/rrhh/centros/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo borrar el centro.'));
  }

  async listDepartamentos(): Promise<DepartmentDto[]> {
    const res = await apiFetch('/rrhh/departamentos');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los departamentos.'));
    return res.json();
  }

  async crearDepartamento(input: CreateDepartmentDto): Promise<DepartmentDto> {
    const res = await apiFetch('/rrhh/departamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo crear el departamento.'));
    return res.json();
  }

  async editarDepartamento(id: number, input: UpdateDepartmentDto): Promise<DepartmentDto> {
    const res = await apiFetch(`/rrhh/departamentos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo guardar el departamento.'));
    return res.json();
  }

  async borrarDepartamento(id: number): Promise<void> {
    const res = await apiFetch(`/rrhh/departamentos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo borrar el departamento.'));
  }

  // ---- Fichajes ----

  async jornadaHoy(): Promise<JornadaHoyDto> {
    const res = await apiFetch('/rrhh/fichajes/hoy');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar tu jornada de hoy.'));
    return res.json();
  }

  async fichar(input: FicharDto): Promise<JornadaHoyDto> {
    const res = await apiFetch('/rrhh/fichajes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo registrar el fichaje.'));
    return res.json();
  }

  async miHistorico(desde?: string, hasta?: string): Promise<HistoricoFichajeDto> {
    const qs = new URLSearchParams();
    if (desde) qs.set('desde', desde);
    if (hasta) qs.set('hasta', hasta);
    const res = await apiFetch(`/rrhh/fichajes/historico${qs.toString() ? `?${qs}` : ''}`);
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar tu histórico.'));
    return res.json();
  }

  async panelFichajes(): Promise<PanelFichajeDto> {
    const res = await apiFetch('/rrhh/fichajes/panel');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar el cuadro de mando.'));
    return res.json();
  }
}
