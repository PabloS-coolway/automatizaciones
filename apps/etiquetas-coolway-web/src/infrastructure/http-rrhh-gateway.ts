import type { CreateEmployeeDto, EmployeeDto, RrhhMeDto } from '@yorga/contracts';
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
}
