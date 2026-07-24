import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateSurtidoDto, SurtidoDto, UpdateSurtidoDto } from '@yorga/contracts';
import { SurtidosService } from '../../application/surtidos.service';
import { SurtidoInvalidoError } from '../../domain/surtido';
import { CurrentUser, RequireFeature } from '../../../auth/interface/http/decorators';
import { JwtPayload } from '../../../auth/application/auth.service';
import { Actor } from '../../../actividad/application/activity-recorder.port';

/** El actor de una acción, sacado del JWT (para el log de actividad). */
const actorDe = (u: JwtPayload): Actor => ({ userId: u.sub, email: u.email });

/**
 * REQ-010 · Fase 2 — Administración del catálogo de surtidos (ref → SURTD). Requiere `maestro.cargar`: es
 * parte del alta en SAP, como podar. La poda usa estas asignaciones para dejar sólo el surtido elegido.
 */
@RequireFeature('maestro.cargar')
@Controller('surtidos')
export class SurtidosController {
  constructor(private readonly service: SurtidosService) {}

  @Get()
  list(): Promise<SurtidoDto[]> {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateSurtidoDto, @CurrentUser() me: JwtPayload): Promise<SurtidoDto> {
    return this.service.create(dto, actorDe(me)).catch(traducir);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSurtidoDto, @CurrentUser() me: JwtPayload): Promise<SurtidoDto> {
    return this.service.update(Number(id), dto, actorDe(me)).catch(traducir);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentUser() me: JwtPayload): Promise<{ ok: true }> {
    await this.service.remove(Number(id), actorDe(me)).catch(traducir);
    return { ok: true };
  }
}

/** Un dato inválido es culpa de quien lo manda (400), no un fallo del servidor: se dice qué pasa. */
function traducir(e: unknown): never {
  if (e instanceof SurtidoInvalidoError) throw new BadRequestException(e.message);
  throw e;
}
