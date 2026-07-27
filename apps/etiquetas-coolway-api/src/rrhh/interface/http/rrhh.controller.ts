import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  CenterDto,
  CreateCenterDto,
  CreateDepartmentDto,
  CreateEmployeeDto,
  DepartmentDto,
  EmployeeDto,
  FicharDto,
  JornadaHoyDto,
  RrhhMeDto,
  TimeEntryDto,
  UpdateCenterDto,
  UpdateDepartmentDto,
  UpdateEmployeeDto,
} from '@yorga/contracts';
import { CurrentUser } from '../../../auth/interface/http/decorators';
import { JwtPayload } from '../../../auth/application/auth.service';
import { CenterRow, DepartmentRow, EmployeeRow, TimeEntryRow } from '../../application/ports';
import { RrhhError, RrhhService } from '../../application/rrhh.service';
import { RrhhStructureService } from '../../application/rrhh-structure.service';
import { FichajeService, Jornada } from '../../application/fichaje.service';
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
    return toJornadaDto(await this.fichaje.fichar(actor.id, dto.kind, source).catch(traducir));
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
