import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { CreateDestinationDto, DestinationDto, UpdateDestinationDto } from '@yorga/contracts';
import { DestinationsService } from '../../application/destinations.service';
import { InvalidDestinationError } from '../../domain/destination';
import { RequireFeature } from '../../../auth/interface/http/decorators';

/**
 * REQ-004 · Administración de destinos. **Sólo admin**: un destino decide qué códigos lleva la
 * etiqueta, y equivocarse imprime códigos que no son.
 * No hay DELETE a propósito: los destinos se **desactivan** (PATCH active:false), para no romper el
 * histórico ni perder el dato.
 */
@RequireFeature('destinos.gestionar')
@Controller('destinos')
export class DestinationsController {
  constructor(private readonly service: DestinationsService) {}

  @Get()
  list(): Promise<DestinationDto[]> {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateDestinationDto): Promise<DestinationDto> {
    return this.service.create(dto).catch(traducir);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDestinationDto): Promise<DestinationDto> {
    return this.service.update(Number(id), dto).catch(traducir);
  }
}

/** Un dato inválido es culpa del que lo manda (400), no un fallo del servidor: se dice qué pasa. */
function traducir(e: unknown): never {
  if (e instanceof InvalidDestinationError) throw new BadRequestException(e.message);
  throw e;
}
