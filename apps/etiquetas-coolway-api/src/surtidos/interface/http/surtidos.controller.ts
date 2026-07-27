import { BadRequestException, Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CreatePodaSurtidoDto, PodaSurtidoDto } from '@yorga/contracts';
import { SurtidoInvalidoError, SurtidosService } from '../../application/surtidos.service';
import { CurrentUser, RequireFeature } from '../../../auth/interface/http/decorators';
import { JwtPayload } from '../../../auth/application/auth.service';
import { Actor } from '../../../actividad/application/activity-recorder.port';

const actorDe = (u: JwtPayload): Actor => ({ userId: u.sub, email: u.email });

/**
 * REQ-011 · Catálogo de surtidos por grupo (prefijo de referencia). Requiere `maestro.cargar`: es parte del
 * alta en SAP, como la poda. La poda usa este catálogo (si se activa) para dejar sólo los surtidos elegidos.
 */
@RequireFeature('maestro.cargar')
@Controller('surtidos')
export class SurtidosController {
  constructor(private readonly service: SurtidosService) {}

  @Get()
  list(): Promise<PodaSurtidoDto[]> {
    return this.service.list();
  }

  @Post()
  agregar(@Body() dto: CreatePodaSurtidoDto, @CurrentUser() me: JwtPayload): Promise<PodaSurtidoDto> {
    return this.service.agregar(dto, actorDe(me)).catch(traducir);
  }

  @Delete(':id')
  async quitar(@Param('id') id: string, @CurrentUser() me: JwtPayload): Promise<{ ok: true }> {
    await this.service.quitar(Number(id), actorDe(me)).catch(traducir);
    return { ok: true };
  }
}

/** Un dato inválido es culpa de quien lo manda (400), no un fallo del servidor: se dice qué pasa. */
function traducir(e: unknown): never {
  if (e instanceof SurtidoInvalidoError) throw new BadRequestException(e.message);
  throw e;
}
