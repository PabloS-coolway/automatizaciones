import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import {
  CenterDto,
  CreateCenterDto,
  CreateDepartmentDto,
  AbsenceDto,
  AbsenceTypeDto,
  CalendarioAusenciasDto,
  CorreccionFichajeDto,
  CreateAbsenceTypeDto,
  CreateEmployeeDto,
  CumpleDto,
  DecidirAusenciaDto,
  DepartmentDto,
  DiaDetalleFichajeDto,
  EmployeeDto,
  FicharDto,
  HistoricoFichajeDto,
  JornadaHoyDto,
  NotificacionDto,
  OrgEmployeeDto,
  PanelFichajeDto,
  RrhhActivityListDto,
  RrhhMeDto,
  SaldoVacacionesDto,
  UsuarioSinFichaDto,
  SolicitarAusenciaDto,
  TimeEntryDto,
  UpdateAbsenceTypeDto,
  UpdateCenterDto,
  UpdateDepartmentDto,
  UpdateEmployeeDto,
} from '@yorga/contracts';
import { CurrentUser } from '../../../auth/interface/http/decorators';
import { JwtPayload } from '../../../auth/application/auth.service';
import { CenterRow, DepartmentRow, EmployeeRow, TimeEntryRow } from '../../application/ports';
import { RrhhError, RrhhService } from '../../application/rrhh.service';
import { RrhhStructureService } from '../../application/rrhh-structure.service';
import { DiaDetalle, DiaJornada, FichajeService, Jornada, Panel } from '../../application/fichaje.service';
import { AusenciaService } from '../../application/ausencia.service';
import { NotificacionService } from '../../application/notificacion.service';
import { RrhhActivityQueryService } from '../../application/rrhh-activity-query.service';
import { AbsenceRow, AbsenceTypeRow, NotificationRow } from '../../application/ports';
import { proximosCumpleanos } from '../../domain/cumpleanos';
import { diasDeRango, diasSolicitados } from '../../domain/ausencia';
import { esMarcaje } from '../../domain/fichaje';
import { gestionaPlantilla } from '../../domain/rrhh-org';
import { RrhhActor, RrhhGuard } from './rrhh.guard';

function toDto(e: EmployeeRow): EmployeeDto {
  return {
    id: e.id,
    fullName: e.fullName,
    email: e.email,
    position: e.position,
    rrhhRole: e.rrhhRole,
    managerId: e.managerId,
    active: e.active,
    department: e.department,
    departmentId: e.departmentId,
    center: e.center,
    centerId: e.centerId,
    brand: e.brand,
    weeklyMinutes: e.weeklyMinutes,
    annualLeaveDays: e.annualLeaveDays,
    birthDate: e.birthDate,
  };
}

const toCenterDto = (c: CenterRow): CenterDto => ({ id: c.id, name: c.name, brand: c.brand, employees: c.employees });
const toDeptDto = (d: DepartmentRow): DepartmentDto => ({ id: d.id, name: d.name, employees: d.employees });
const toEntryDto = (e: TimeEntryRow): TimeEntryDto => ({ id: e.id, kind: e.kind as TimeEntryDto['kind'], at: e.at.toISOString(), source: e.source, note: e.note });
const toJornadaDto = (j: Jornada): JornadaHoyDto => ({
  fecha: j.fecha.toISOString().slice(0, 10),
  estado: j.estado,
  posibles: j.posibles,
  minutosTrabajados: j.minutosTrabajados,
  fichajes: j.fichajes.map(toEntryDto),
});
const toPanelDto = (p: Panel): PanelFichajeDto => ({ ahora: p.ahora, incidencias: p.incidencias });
const toHistoricoDto = (desde: Date, hasta: Date, dias: DiaJornada[]): HistoricoFichajeDto => ({
  desde: desde.toISOString().slice(0, 10),
  hasta: hasta.toISOString().slice(0, 10),
  dias: dias.map((d) => ({ fecha: d.fecha, minutosTrabajados: d.minutosTrabajados, minutosExtra: d.minutosExtra, fichajes: d.fichajes.map(toEntryDto) })),
  totalMinutos: dias.reduce((s, d) => s + d.minutosTrabajados, 0),
  totalExtra: dias.reduce((s, d) => s + d.minutosExtra, 0),
});
const toDiaDetalleDto = (d: DiaDetalle): DiaDetalleFichajeDto => ({
  fecha: d.fecha,
  minutosTrabajados: d.minutosTrabajados,
  entradas: d.entradas.map(({ row, anulado }) => ({
    id: row.id,
    kind: row.kind,
    at: row.at.toISOString(),
    source: row.source,
    note: row.note,
    actorEmail: row.actorEmail,
    anulado,
    latitude: row.latitude,
    longitude: row.longitude,
    accuracy: row.accuracy,
  })),
});

const diaISO = (d: Date): string => d.toISOString().slice(0, 10);
const toTipoAusenciaDto = (t: AbsenceTypeRow): AbsenceTypeDto => ({
  id: t.id,
  name: t.name,
  computesBalance: t.computesBalance,
  requiresApproval: t.requiresApproval,
  requiresAttachment: t.requiresAttachment,
  active: t.active,
  usos: t.usos,
});
const toAusenciaDto = (a: AbsenceRow): AbsenceDto => ({
  id: a.id,
  employeeId: a.employeeId,
  employeeName: a.employeeName,
  department: a.department,
  typeId: a.typeId,
  typeName: a.typeName,
  startDate: diaISO(a.startDate),
  endDate: diaISO(a.endDate),
  halfDay: a.halfDay,
  dias: diasSolicitados({ start: a.startDate, end: a.endDate }, a.halfDay),
  reason: a.reason,
  status: a.status as AbsenceDto['status'],
  decidedByEmail: a.decidedByEmail,
  decidedAt: a.decidedAt ? a.decidedAt.toISOString() : null,
  decisionNote: a.decisionNote,
  attachmentName: a.attachmentName,
  createdAt: a.createdAt.toISOString(),
});

/** Rango `[desde, hasta)` a partir de query YYYY-MM-DD; por defecto, los últimos 30 días hasta mañana. */
function rangoDesdeQuery(desde?: string, hasta?: string): { desde: Date; hasta: Date } {
  const hoy = new Date();
  const finPorDefecto = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
  const iniPorDefecto = new Date(finPorDefecto);
  iniPorDefecto.setDate(iniPorDefecto.getDate() - 31);
  const d = desde ? new Date(`${desde}T00:00:00`) : iniPorDefecto;
  const h = hasta ? new Date(`${hasta}T00:00:00`) : finPorDefecto;
  if (Number.isNaN(d.getTime()) || Number.isNaN(h.getTime())) throw new BadRequestException('Fechas inválidas (usa YYYY-MM-DD).');
  return { desde: d, hasta: h };
}

/** Sólo RRHH/Admin gestionan la plantilla. */
function exigeGestion(actor: EmployeeRow): void {
  if (!gestionaPlantilla(actor.rrhhRole)) throw new ForbiddenException('Sólo RRHH o Admin pueden gestionar la plantilla.');
}

/** Un dato inválido es culpa de quien lo manda (400), no un fallo del servidor: se dice qué pasa. */
function traducir(e: unknown): never {
  if (e instanceof RrhhError) throw new BadRequestException(e.message);
  throw e;
}

/**
 * REQ-008 · Puerta del módulo RRHH. `me` sirve a cualquier usuario autenticado; el resto exige ficha de
 * empleado (`RrhhGuard`) y, para gestionar la plantilla (alta/edición/baja/reactivación), rol RRHH/Admin.
 */
@Controller('rrhh')
export class RrhhController {
  constructor(
    private readonly service: RrhhService,
    private readonly estructura: RrhhStructureService,
    private readonly fichaje: FichajeService,
    private readonly ausencias: AusenciaService,
    private readonly notificaciones: NotificacionService,
    private readonly actividad: RrhhActivityQueryService,
  ) {}

  @Get('me')
  async me(@CurrentUser() u: JwtPayload): Promise<RrhhMeDto> {
    const e = await this.service.me(u.sub);
    return { employee: e ? toDto(e) : null };
  }

  @Get('empleados')
  @UseGuards(RrhhGuard)
  async empleados(@RrhhActor() actor: EmployeeRow): Promise<EmployeeDto[]> {
    return (await this.service.listVisible(actor)).map(toDto);
  }

  @Get('usuarios-sin-ficha')
  @UseGuards(RrhhGuard)
  async usuariosSinFicha(@RrhhActor() actor: EmployeeRow): Promise<UsuarioSinFichaDto[]> {
    exigeGestion(actor);
    return this.service.usuariosSinFicha();
  }

  @Get('cumpleanos')
  @UseGuards(RrhhGuard)
  async cumpleanos(@Query('dias') dias?: string): Promise<CumpleDto[]> {
    const ventana = Math.min(Math.max(Number(dias) || 30, 1), 366);
    const plantilla = await this.service.plantillaParaCumples();
    return proximosCumpleanos(plantilla, new Date(), ventana);
  }

  @Get('organigrama')
  @UseGuards(RrhhGuard)
  async organigrama(): Promise<OrgEmployeeDto[]> {
    // Organigrama público: cualquier empleado ve la estructura completa (sin datos sensibles).
    return (await this.service.organigrama()).map((e) => ({
      id: e.id,
      fullName: e.fullName,
      position: e.position,
      rrhhRole: e.rrhhRole,
      managerId: e.managerId,
      active: e.active,
      center: e.center,
      brand: e.brand,
    }));
  }

  @Post('empleados')
  @UseGuards(RrhhGuard)
  async crear(@RrhhActor() actor: EmployeeRow, @Body() dto: CreateEmployeeDto): Promise<EmployeeDto> {
    exigeGestion(actor);
    return toDto(await this.service.crear(dto, { email: actor.email }).catch(traducir));
  }

  @Patch('empleados/:id')
  @UseGuards(RrhhGuard)
  async editar(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @Body() dto: UpdateEmployeeDto): Promise<EmployeeDto> {
    exigeGestion(actor);
    return toDto(await this.service.editar(Number(id), dto, { email: actor.email }).catch(traducir));
  }

  @Post('empleados/:id/baja')
  @UseGuards(RrhhGuard)
  async baja(@RrhhActor() actor: EmployeeRow, @Param('id') id: string): Promise<EmployeeDto> {
    exigeGestion(actor);
    return toDto(await this.service.darDeBaja(Number(id), { email: actor.email }).catch(traducir));
  }

  @Post('empleados/:id/reactivar')
  @UseGuards(RrhhGuard)
  async reactivar(@RrhhActor() actor: EmployeeRow, @Param('id') id: string): Promise<EmployeeDto> {
    exigeGestion(actor);
    return toDto(await this.service.reactivar(Number(id), { email: actor.email }).catch(traducir));
  }

  // ---- Fichajes: cada empleado ficha por sí mismo (no requiere rol de gestión). ----

  @Get('fichajes/hoy')
  @UseGuards(RrhhGuard)
  async miJornada(@RrhhActor() actor: EmployeeRow): Promise<JornadaHoyDto> {
    return toJornadaDto(await this.fichaje.jornadaHoy(actor.id));
  }

  @Post('fichajes')
  @UseGuards(RrhhGuard)
  async fichar(@RrhhActor() actor: EmployeeRow, @Body() dto: FicharDto): Promise<JornadaHoyDto> {
    if (!esMarcaje(String(dto.kind))) throw new BadRequestException(`Marcaje no válido: "${dto.kind}".`);
    const source = dto.source === 'MOBILE' ? 'MOBILE' : 'WEB';
    // Geolocalización opcional: sólo números válidos (si el navegador no la dio, se ficha igual sin coords).
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
    const geo = { latitude: num(dto.latitude), longitude: num(dto.longitude), accuracy: num(dto.accuracy) };
    return toJornadaDto(await this.fichaje.fichar(actor.id, dto.kind, source, geo).catch(traducir));
  }

  @Get('fichajes/historico')
  @UseGuards(RrhhGuard)
  async miHistorico(@RrhhActor() actor: EmployeeRow, @Query('desde') desde?: string, @Query('hasta') hasta?: string): Promise<HistoricoFichajeDto> {
    const r = rangoDesdeQuery(desde, hasta);
    return toHistoricoDto(r.desde, r.hasta, await this.fichaje.historico(actor.id, r.desde, r.hasta, actor.weeklyMinutes));
  }

  @Get('fichajes/panel')
  @UseGuards(RrhhGuard)
  async panel(@RrhhActor() actor: EmployeeRow): Promise<PanelFichajeDto> {
    const visibles = await this.service.listVisible(actor);
    const ids = visibles.map((e) => e.id);
    // Coordinación con ausencias: un día cubierto por una ausencia aprobada no es incidencia.
    const desde = new Date();
    desde.setDate(desde.getDate() - 8);
    const aprobadas = await this.ausencias.diasConAusenciaAprobada(ids, desde, new Date());
    const diasConAusencia = new Set<string>();
    for (const a of aprobadas) for (const d of diasDeRango({ start: a.startDate, end: a.endDate })) diasConAusencia.add(`${a.employeeId}:${d}`);
    return toPanelDto(await this.fichaje.panel(visibles.map((e) => ({ id: e.id, fullName: e.fullName })), diasConAusencia));
  }

  @Get('empleados/:id/fichajes')
  @UseGuards(RrhhGuard)
  async historicoEmpleado(
    @RrhhActor() actor: EmployeeRow,
    @Param('id') id: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ): Promise<HistoricoFichajeDto> {
    const objetivo = await this.exigeVisible(actor, Number(id));
    const r = rangoDesdeQuery(desde, hasta);
    return toHistoricoDto(r.desde, r.hasta, await this.fichaje.historico(objetivo.id, r.desde, r.hasta, objetivo.weeklyMinutes));
  }

  @Get('empleados/:id/fichajes/dia')
  @UseGuards(RrhhGuard)
  async diaEmpleado(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @Query('fecha') fecha?: string): Promise<DiaDetalleFichajeDto> {
    exigeGestion(actor);
    const objetivo = await this.exigeVisible(actor, Number(id));
    const dia = fecha ? new Date(`${fecha}T00:00:00`) : new Date();
    if (Number.isNaN(dia.getTime())) throw new BadRequestException('Fecha inválida (usa YYYY-MM-DD).');
    return toDiaDetalleDto(await this.fichaje.diaDetalle(objetivo.id, dia));
  }

  @Post('empleados/:id/fichajes/correccion')
  @UseGuards(RrhhGuard)
  async corregirFichaje(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @Body() dto: CorreccionFichajeDto): Promise<DiaDetalleFichajeDto> {
    exigeGestion(actor);
    const objetivo = await this.exigeVisible(actor, Number(id));
    if (dto.action !== 'ADD' && dto.action !== 'VOID') throw new BadRequestException('Acción de corrección no válida (ADD | VOID).');
    const at = dto.at ? new Date(dto.at) : undefined;
    const detalle = await this.fichaje
      .corregir(objetivo.id, { action: dto.action, kind: dto.kind, at, targetId: dto.targetId, note: dto.note }, { email: actor.email })
      .catch(traducir);
    return toDiaDetalleDto(detalle);
  }

  // ---- Ausencias: catálogo de tipos (gestión) + solicitudes (empleado) + aprobación (responsable/RRHH). ----

  @Get('ausencias/tipos')
  @UseGuards(RrhhGuard)
  async tiposAusencia(@RrhhActor() actor: EmployeeRow): Promise<AbsenceTypeDto[]> {
    // El empleado sólo ve los activos (para pedir); quien gestiona ve todos (para administrar).
    return (await this.ausencias.listTipos(!gestionaPlantilla(actor.rrhhRole))).map(toTipoAusenciaDto);
  }

  @Post('ausencias/tipos')
  @UseGuards(RrhhGuard)
  async crearTipoAusencia(@RrhhActor() actor: EmployeeRow, @Body() dto: CreateAbsenceTypeDto): Promise<AbsenceTypeDto> {
    exigeGestion(actor);
    return toTipoAusenciaDto(await this.ausencias.crearTipo(dto, { email: actor.email }).catch(traducir));
  }

  @Patch('ausencias/tipos/:id')
  @UseGuards(RrhhGuard)
  async editarTipoAusencia(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @Body() dto: UpdateAbsenceTypeDto): Promise<AbsenceTypeDto> {
    exigeGestion(actor);
    return toTipoAusenciaDto(await this.ausencias.editarTipo(Number(id), dto, { email: actor.email }).catch(traducir));
  }

  @Delete('ausencias/tipos/:id')
  @HttpCode(204)
  @UseGuards(RrhhGuard)
  async borrarTipoAusencia(@RrhhActor() actor: EmployeeRow, @Param('id') id: string): Promise<void> {
    exigeGestion(actor);
    await this.ausencias.borrarTipo(Number(id), { email: actor.email }).catch(traducir);
  }

  @Get('ausencias/mias')
  @UseGuards(RrhhGuard)
  async misAusencias(@RrhhActor() actor: EmployeeRow): Promise<AbsenceDto[]> {
    return (await this.ausencias.misAusencias(actor.id)).map(toAusenciaDto);
  }

  @Get('ausencias/saldo')
  @UseGuards(RrhhGuard)
  async miSaldo(@RrhhActor() actor: EmployeeRow, @Query('year') year?: string): Promise<SaldoVacacionesDto> {
    const y = year ? Number(year) : new Date().getFullYear();
    if (!Number.isInteger(y)) throw new BadRequestException('Año inválido.');
    const s = await this.ausencias.saldo(actor.id, actor.annualLeaveDays, y);
    return { year: y, ...s };
  }

  @Get('ausencias/calendario')
  @UseGuards(RrhhGuard)
  async calendario(@RrhhActor() actor: EmployeeRow, @Query('desde') desde?: string, @Query('hasta') hasta?: string): Promise<CalendarioAusenciasDto> {
    const r = rangoDesdeQuery(desde, hasta);
    const ids = (await this.service.listVisible(actor)).map((e) => e.id);
    const aus = await this.ausencias.calendario(ids, r.desde, r.hasta);
    return { desde: r.desde.toISOString().slice(0, 10), hasta: r.hasta.toISOString().slice(0, 10), ausencias: aus.map(toAusenciaDto) };
  }

  @Post('ausencias')
  @UseGuards(RrhhGuard)
  async solicitarAusencia(@RrhhActor() actor: EmployeeRow, @Body() dto: SolicitarAusenciaDto): Promise<AbsenceDto> {
    return toAusenciaDto(await this.ausencias.solicitar(actor.id, dto, { email: actor.email }).catch(traducir));
  }

  @Get('ausencias/pendientes')
  @UseGuards(RrhhGuard)
  async ausenciasPendientes(@RrhhActor() actor: EmployeeRow): Promise<AbsenceDto[]> {
    if (actor.rrhhRole === 'EMPLEADO') throw new ForbiddenException('No apruebas ausencias.');
    const visibles = (await this.service.listVisible(actor)).filter((e) => e.id !== actor.id); // no te apruebas a ti mismo
    return (await this.ausencias.pendientesDe(visibles.map((e) => e.id))).map(toAusenciaDto);
  }

  @Post('ausencias/:id/anular')
  @UseGuards(RrhhGuard)
  async anularAusencia(@RrhhActor() actor: EmployeeRow, @Param('id') id: string): Promise<AbsenceDto> {
    const solicitud = await this.ausencias.buscar(Number(id));
    if (!solicitud) throw new BadRequestException(`No existe la solicitud #${id}.`);
    const esGestion = gestionaPlantilla(actor.rrhhRole); // RRHH/Admin
    const esDueno = solicitud.employeeId === actor.id;
    // Pendiente: la puede cancelar el propio empleado o RRHH/Admin. Aprobada: sólo RRHH/Admin (borrado lógico).
    if (solicitud.status === 'PENDING') {
      if (!esDueno && !esGestion) throw new ForbiddenException('No puedes cancelar esa solicitud.');
    } else if (solicitud.status === 'APPROVED') {
      if (!esGestion) throw new ForbiddenException('Una ausencia aprobada solo la puede cancelar RRHH/Admin.');
    } else {
      throw new BadRequestException('Esa solicitud ya no está activa.');
    }
    const avisar = !esDueno; // si la cancela otro (un admin), se avisa al empleado
    return toAusenciaDto(await this.ausencias.anular(Number(id), { email: actor.email }, avisar).catch(traducir));
  }

  @Post('ausencias/:id/aprobar')
  @UseGuards(RrhhGuard)
  async aprobarAusencia(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @Body() dto: DecidirAusenciaDto): Promise<AbsenceDto> {
    return toAusenciaDto(await this.decidirAusencia(actor, Number(id), true, dto.note));
  }

  @Post('ausencias/:id/rechazar')
  @UseGuards(RrhhGuard)
  async rechazarAusencia(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @Body() dto: DecidirAusenciaDto): Promise<AbsenceDto> {
    return toAusenciaDto(await this.decidirAusencia(actor, Number(id), false, dto.note));
  }

  @Post('ausencias/:id/justificante')
  @UseGuards(RrhhGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 11 * 1024 * 1024 } }))
  async subirJustificante(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @UploadedFile() file?: Express.Multer.File): Promise<AbsenceDto> {
    if (!file) throw new BadRequestException('Falta el fichero (campo "file").');
    await this.exigeAccesoAusencia(actor, Number(id));
    const subida = { buffer: file.buffer, originalname: file.originalname, mimetype: file.mimetype, size: file.size };
    return toAusenciaDto(await this.ausencias.adjuntar(Number(id), subida, { email: actor.email }).catch(traducir));
  }

  @Get('ausencias/:id/justificante')
  @UseGuards(RrhhGuard)
  async bajarJustificante(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @Res() res: Response): Promise<void> {
    await this.exigeAccesoAusencia(actor, Number(id));
    const { buffer, nombre } = await this.ausencias.descargarJustificante(Number(id)).catch(traducir);
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.send(buffer);
  }

  /** Acceso a una ausencia (y su justificante): el propio empleado, o quien la vea (responsable/RRHH). */
  private async exigeAccesoAusencia(actor: EmployeeRow, id: number): Promise<void> {
    const ausencia = await this.ausencias.buscar(id);
    if (!ausencia) throw new BadRequestException(`No existe la solicitud #${id}.`);
    if (ausencia.employeeId === actor.id) return; // el dueño siempre
    const visibles = await this.service.listVisible(actor);
    if (!visibles.some((e) => e.id === ausencia.employeeId)) throw new ForbiddenException('No puedes acceder a esa solicitud.');
  }

  /** Decide una ausencia validando que el actor puede aprobar a ese empleado (responsable/RRHH, no a sí mismo). */
  private async decidirAusencia(actor: EmployeeRow, id: number, aprobar: boolean, nota?: string): Promise<AbsenceRow> {
    if (actor.rrhhRole === 'EMPLEADO') throw new ForbiddenException('No apruebas ausencias.');
    const solicitud = await this.ausencias.buscar(id);
    if (!solicitud) throw new BadRequestException(`No existe la solicitud #${id}.`);
    if (solicitud.employeeId === actor.id) throw new ForbiddenException('No puedes decidir tu propia ausencia.');
    const visibles = await this.service.listVisible(actor);
    if (!visibles.some((e) => e.id === solicitud.employeeId)) throw new ForbiddenException('Esa persona no está en tu equipo.');
    return this.ausencias.decidir(id, aprobar, { email: actor.email }, nota).catch(traducir);
  }

  // ---- Panel de actividad RRHH (auditoría, sólo RRHH/Admin). ----

  @Get('actividad')
  @UseGuards(RrhhGuard)
  async actividadRrhh(
    @RrhhActor() actor: EmployeeRow,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('entity') entity?: string,
    @Query('actor') actorFiltro?: string,
  ): Promise<RrhhActivityListDto> {
    exigeGestion(actor);
    return this.actividad.list(Number(page) || 0, Number(pageSize) || 50, entity, actorFiltro);
  }

  // ---- Avisos in-app (cada empleado los suyos). ----

  @Get('notificaciones')
  @UseGuards(RrhhGuard)
  async notificaciones_(@RrhhActor() actor: EmployeeRow): Promise<NotificacionDto[]> {
    return (await this.notificaciones.listar(actor.id)).map((n: NotificationRow) => ({ id: n.id, message: n.message, link: n.link, read: n.read, createdAt: n.createdAt.toISOString() }));
  }

  @Get('notificaciones/no-leidas')
  @UseGuards(RrhhGuard)
  async noLeidas(@RrhhActor() actor: EmployeeRow): Promise<{ count: number }> {
    return { count: await this.notificaciones.noLeidas(actor.id) };
  }

  @Post('notificaciones/:id/leer')
  @HttpCode(204)
  @UseGuards(RrhhGuard)
  async leerNotificacion(@RrhhActor() actor: EmployeeRow, @Param('id') id: string): Promise<void> {
    await this.notificaciones.marcarLeida(Number(id), actor.id);
  }

  @Post('notificaciones/leer-todas')
  @HttpCode(204)
  @UseGuards(RrhhGuard)
  async leerTodas(@RrhhActor() actor: EmployeeRow): Promise<void> {
    await this.notificaciones.marcarTodas(actor.id);
  }

  /** Exige que `objetivo` esté en la rama visible del actor (si no, 403). Devuelve la ficha visible. */
  private async exigeVisible(actor: EmployeeRow, objetivo: number): Promise<EmployeeRow> {
    const visibles = await this.service.listVisible(actor);
    const fila = visibles.find((e) => e.id === objetivo);
    if (!fila) throw new ForbiddenException('No puedes ver los fichajes de ese empleado.');
    return fila;
  }

  // ---- Estructura organizativa: centros (multimarca) y departamentos. Sólo RRHH/Admin. ----

  @Get('centros')
  @UseGuards(RrhhGuard)
  async centros(@RrhhActor() actor: EmployeeRow): Promise<CenterDto[]> {
    exigeGestion(actor);
    return (await this.estructura.listCenters()).map(toCenterDto);
  }

  @Post('centros')
  @UseGuards(RrhhGuard)
  async crearCentro(@RrhhActor() actor: EmployeeRow, @Body() dto: CreateCenterDto): Promise<CenterDto> {
    exigeGestion(actor);
    return toCenterDto(await this.estructura.crearCentro(dto, { email: actor.email }).catch(traducir));
  }

  @Patch('centros/:id')
  @UseGuards(RrhhGuard)
  async editarCentro(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @Body() dto: UpdateCenterDto): Promise<CenterDto> {
    exigeGestion(actor);
    return toCenterDto(await this.estructura.editarCentro(Number(id), dto, { email: actor.email }).catch(traducir));
  }

  @Delete('centros/:id')
  @HttpCode(204)
  @UseGuards(RrhhGuard)
  async borrarCentro(@RrhhActor() actor: EmployeeRow, @Param('id') id: string): Promise<void> {
    exigeGestion(actor);
    await this.estructura.borrarCentro(Number(id), { email: actor.email }).catch(traducir);
  }

  @Get('departamentos')
  @UseGuards(RrhhGuard)
  async departamentos(@RrhhActor() actor: EmployeeRow): Promise<DepartmentDto[]> {
    exigeGestion(actor);
    return (await this.estructura.listDepartments()).map(toDeptDto);
  }

  @Post('departamentos')
  @UseGuards(RrhhGuard)
  async crearDepartamento(@RrhhActor() actor: EmployeeRow, @Body() dto: CreateDepartmentDto): Promise<DepartmentDto> {
    exigeGestion(actor);
    return toDeptDto(await this.estructura.crearDepartamento(dto, { email: actor.email }).catch(traducir));
  }

  @Patch('departamentos/:id')
  @UseGuards(RrhhGuard)
  async editarDepartamento(@RrhhActor() actor: EmployeeRow, @Param('id') id: string, @Body() dto: UpdateDepartmentDto): Promise<DepartmentDto> {
    exigeGestion(actor);
    return toDeptDto(await this.estructura.editarDepartamento(Number(id), dto, { email: actor.email }).catch(traducir));
  }

  @Delete('departamentos/:id')
  @HttpCode(204)
  @UseGuards(RrhhGuard)
  async borrarDepartamento(@RrhhActor() actor: EmployeeRow, @Param('id') id: string): Promise<void> {
    exigeGestion(actor);
    await this.estructura.borrarDepartamento(Number(id), { email: actor.email }).catch(traducir);
  }
}
