import { Controller, Get, Query } from '@nestjs/common';
import { ActivityListResponse } from '@yorga/contracts';
import { ActivityQueryService } from '../../application/activity-query.service';
import { RequireFeature } from '../../../auth/interface/http/decorators';

/** REQ-007 · Consulta del log de actividad. Sólo quien tenga la feature `actividad.ver`. */
@RequireFeature('actividad.ver')
@Controller('actividad')
export class ActividadController {
  constructor(private readonly query: ActivityQueryService) {}

  @Get()
  list(@Query('page') page?: string, @Query('pageSize') pageSize?: string): Promise<ActivityListResponse> {
    return this.query.list(Number(page) || 0, Number(pageSize) || 50);
  }
}
