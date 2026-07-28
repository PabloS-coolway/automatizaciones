import type {
  CenterDto,
  CreateCenterDto,
  CreateDepartmentDto,
  AbsenceDto,
  AbsenceTypeDto,
  CalendarioAusenciasDto,
  CorreccionFichajeDto,
  CreateAbsenceTypeDto,
  CreateEmployeeDto,
  DepartmentDto,
  DiaDetalleFichajeDto,
  EmployeeDto,
  FicharDto,
  OrgEmployeeDto,
  UsuarioSinFichaDto,
  HistoricoFichajeDto,
  JornadaHoyDto,
  NotificacionDto,
  PanelFichajeDto,
  RrhhActivityListDto,
  RrhhMeDto,
  SaldoVacacionesDto,
  SolicitarAusenciaDto,
  UpdateAbsenceTypeDto,
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

  /** Organigrama público: toda la plantilla activa (para que cualquiera vea la estructura). */
  async organigrama(): Promise<OrgEmployeeDto[]> {
    const res = await apiFetch('/rrhh/organigrama');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar el organigrama.'));
    return res.json();
  }

  /** Usuarios del login sin ficha de empleado (candidatos a dar de alta). */
  async usuariosSinFicha(): Promise<UsuarioSinFichaDto[]> {
    const res = await apiFetch('/rrhh/usuarios-sin-ficha');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los usuarios sin ficha.'));
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

  async diaEmpleado(id: number, fecha: string): Promise<DiaDetalleFichajeDto> {
    const res = await apiFetch(`/rrhh/empleados/${id}/fichajes/dia?fecha=${fecha}`);
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar el día.'));
    return res.json();
  }

  async corregirFichaje(id: number, input: CorreccionFichajeDto): Promise<DiaDetalleFichajeDto> {
    const res = await apiFetch(`/rrhh/empleados/${id}/fichajes/correccion`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo aplicar la corrección.'));
    return res.json();
  }

  // ---- Ausencias ----

  async listTiposAusencia(): Promise<AbsenceTypeDto[]> {
    const res = await apiFetch('/rrhh/ausencias/tipos');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los tipos de ausencia.'));
    return res.json();
  }

  async crearTipoAusencia(input: CreateAbsenceTypeDto): Promise<AbsenceTypeDto> {
    const res = await apiFetch('/rrhh/ausencias/tipos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo crear el tipo.'));
    return res.json();
  }

  async editarTipoAusencia(id: number, input: UpdateAbsenceTypeDto): Promise<AbsenceTypeDto> {
    const res = await apiFetch(`/rrhh/ausencias/tipos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo guardar el tipo.'));
    return res.json();
  }

  async borrarTipoAusencia(id: number): Promise<void> {
    const res = await apiFetch(`/rrhh/ausencias/tipos/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo borrar el tipo.'));
  }

  async misAusencias(): Promise<AbsenceDto[]> {
    const res = await apiFetch('/rrhh/ausencias/mias');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar tus ausencias.'));
    return res.json();
  }

  async solicitarAusencia(input: SolicitarAusenciaDto): Promise<AbsenceDto> {
    const res = await apiFetch('/rrhh/ausencias', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo solicitar la ausencia.'));
    return res.json();
  }

  async ausenciasPendientes(): Promise<AbsenceDto[]> {
    const res = await apiFetch('/rrhh/ausencias/pendientes');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar las solicitudes pendientes.'));
    return res.json();
  }

  async subirJustificante(id: number, file: File): Promise<AbsenceDto> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await apiFetch(`/rrhh/ausencias/${id}/justificante`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo subir el justificante.'));
    return res.json();
  }

  /** Descarga el justificante (dato sensible: pasa por la API con auth) y lo abre como fichero. */
  async descargarJustificante(id: number, nombre: string): Promise<void> {
    const res = await apiFetch(`/rrhh/ausencias/${id}/justificante`);
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo descargar el justificante.'));
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  async decidirAusencia(id: number, aprobar: boolean, note?: string): Promise<AbsenceDto> {
    const res = await apiFetch(`/rrhh/ausencias/${id}/${aprobar ? 'aprobar' : 'rechazar'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo decidir la solicitud.'));
    return res.json();
  }

  async miSaldo(): Promise<SaldoVacacionesDto> {
    const res = await apiFetch('/rrhh/ausencias/saldo');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar tu saldo.'));
    return res.json();
  }

  async calendarioAusencias(desde: string, hasta: string): Promise<CalendarioAusenciasDto> {
    const res = await apiFetch(`/rrhh/ausencias/calendario?desde=${desde}&hasta=${hasta}`);
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar el calendario.'));
    return res.json();
  }

  async actividadRrhh(page: number, entity?: string): Promise<RrhhActivityListDto> {
    const qs = new URLSearchParams({ page: String(page), pageSize: '50' });
    if (entity) qs.set('entity', entity);
    const res = await apiFetch(`/rrhh/actividad?${qs}`);
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudo cargar la actividad.'));
    return res.json();
  }

  // ---- Avisos in-app ----

  async notificaciones(): Promise<NotificacionDto[]> {
    const res = await apiFetch('/rrhh/notificaciones');
    if (!res.ok) throw new Error(await errorMessage(res, 'No se pudieron cargar los avisos.'));
    return res.json();
  }

  async avisosNoLeidos(): Promise<number> {
    const res = await apiFetch('/rrhh/notificaciones/no-leidas');
    if (!res.ok) return 0;
    return (await res.json()).count;
  }

  async leerAviso(id: number): Promise<void> {
    await apiFetch(`/rrhh/notificaciones/${id}/leer`, { method: 'POST' });
  }

  async leerTodosAvisos(): Promise<void> {
    await apiFetch('/rrhh/notificaciones/leer-todas', { method: 'POST' });
  }
}
