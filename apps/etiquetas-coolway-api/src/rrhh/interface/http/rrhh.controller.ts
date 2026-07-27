import { BadRequestException, Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { CreateEmployeeDto, EmployeeDto, RrhhMeDto } from '@yorga/contracts';
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

/**
 * REQ-008 · Fase 0 — puerta del módulo RRHH. `me` sirve a cualquier usuario autenticado (para que la web sepa
 * si es empleado y con qué rol); el resto exige ficha de empleado (`RrhhGuard`) y, para el alta, rol RRHH.
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
    if (!gestionaPlantilla(actor.rrhhRole)) {
      throw new ForbiddenException('Sólo RRHH o Admin pueden dar de alta empleados.');
    }
    try {
      return toDto(await this.service.crear(dto));
    } catch (e) {
      if (e instanceof RrhhError) throw new BadRequestException(e.message);
      throw e;
    }
  }
}
