import { Controller, Get, Query } from '@nestjs/common';
import { MaestroStatsDto, ReferencesPageDto } from '@yorga/contracts';
import { MaestroQuery } from '../../application/maestro-query.service';

@Controller('maestro')
export class MaestroController {
  constructor(private readonly query: MaestroQuery) {}

  @Get('stats')
  stats(): Promise<MaestroStatsDto> {
    return this.query.stats();
  }

  @Get('references')
  references(
    @Query('search') search = '',
    @Query('take') take = '100',
    @Query('skip') skip = '0',
  ): Promise<ReferencesPageDto> {
    const t = Math.min(Math.max(Number(take) || 100, 1), 500);
    const s = Math.max(Number(skip) || 0, 0);
    return this.query.references(search, t, s);
  }
}
