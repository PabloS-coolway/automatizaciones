import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateEmployeeDto, EmployeeDto, RrhhMeDto, UpdateEmployeeDto } from '@yorga/contracts';
import { CurrentUser } from '../../../auth/interface/http/decorators';
import { JwtPayload } from '../../../auth/application/auth.service';
import { EmployeeRow } from '../../application/ports';
import { RrhhError, RrhhService } from '../../application/rrhh.service';
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
    center: e.center,
    brand: e.brand,
  };
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
  constructor(private readonly service: RrhhService) {}

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
}
