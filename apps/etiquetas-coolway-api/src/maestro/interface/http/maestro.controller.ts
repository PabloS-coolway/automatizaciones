import { unlink } from 'node:fs/promises';
import { BadRequestException, Controller, Get, Post, Query, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ImportReportDto, MaestroStatsDto, ReferencesPageDto } from '@yorga/contracts';
import { MaestroQuery } from '../../application/maestro-query.service';
import { ImportMasterUseCase } from '../../application/import-master.use-case';
import { ExcelCodesReader } from '../../infrastructure/excel-codes-reader';
import { PrismaReferenceRepository } from '../../infrastructure/prisma-reference.repository';
import { PrismaService } from '../../../infrastructure/db/prisma.service';

type Uploaded = { ean?: Express.Multer.File[]; upc?: Express.Multer.File[] };

@Controller('maestro')
export class MaestroController {
  constructor(
    private readonly query: MaestroQuery,
    private readonly prisma: PrismaService,
  ) {}

  @Get('stats')
  stats(): Promise<MaestroStatsDto> {
    return this.query.stats();
  }

  @Get('references')
  references(@Query('search') search = '', @Query('take') take = '100', @Query('skip') skip = '0'): Promise<ReferencesPageDto> {
    const t = Math.min(Math.max(Number(take) || 100, 1), 500);
    const s = Math.max(Number(skip) || 0, 0);
    return this.query.references(search, t, s);
  }

  @Post('import')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'ean', maxCount: 1 }, { name: 'upc', maxCount: 1 }]))
  async import(@UploadedFiles() files: Uploaded): Promise<ImportReportDto> {
    const ean = files.ean?.[0];
    const upc = files.upc?.[0];
    if (!ean || !upc) throw new BadRequestException('Sube los dos ficheros: EAN.xlsm y UPC.xlsm.');

    try {
      const useCase = new ImportMasterUseCase(new ExcelCodesReader(), new PrismaReferenceRepository(this.prisma));
      return await useCase.execute({ eanSource: ean.path, upcSource: upc.path });
    } finally {
      await Promise.all([ean, upc].map((f) => unlink(f.path).catch(() => undefined)));
    }
  }
}
