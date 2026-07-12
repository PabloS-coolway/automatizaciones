import { unlink } from 'node:fs/promises';
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { ImportReportDto, MaestroStatsDto, ReferencesPageDto, SeedReportDto } from '@yorga/contracts';
import { MaestroQuery } from '../../application/maestro-query.service';
import { ImportMasterUseCase } from '../../application/import-master.use-case';
import { SeedMasterUseCase } from '../../application/seed-master.use-case';
import { ExcelCodesReader } from '../../infrastructure/excel-codes-reader';
import { PrismaReferenceRepository } from '../../infrastructure/prisma-reference.repository';
import { PrismaService } from '../../../infrastructure/db/prisma.service';
import { ExcelMasterReader } from '../../../infrastructure/excel/excel-master-reader.adapter';
import { CurrentUser, Roles } from '../../../auth/interface/http/decorators';
import { JwtPayload } from '../../../auth/application/auth.service';

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

  @Roles('admin') // cargar el maestro completo reescribe la fuente de verdad: sólo administradores
  @Post('seed')
  @UseInterceptors(FileInterceptor('master'))
  async seed(@UploadedFile() master: Express.Multer.File, @CurrentUser() user: JwtPayload): Promise<SeedReportDto> {
    if (!master) throw new BadRequestException('Sube el Excel maestro (campo "master"), p.ej. REFERENCIAS COOLWAY.xlsx.');

    try {
      console.log(`[maestro] seed ejecutado por ${user.email} (${user.role})`); // trazabilidad mínima
      const useCase = new SeedMasterUseCase(new ExcelMasterReader(), new PrismaReferenceRepository(this.prisma));
      return await useCase.execute({ source: master.path });
    } finally {
      await unlink(master.path).catch(() => undefined);
    }
  }

  @Roles('admin') // importar sobrescribe el maestro: sólo administradores
  @Post('import')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'ean', maxCount: 1 }, { name: 'upc', maxCount: 1 }]))
  async import(@UploadedFiles() files: Uploaded, @CurrentUser() user: JwtPayload): Promise<ImportReportDto> {
    const ean = files.ean?.[0];
    const upc = files.upc?.[0];
    if (!ean || !upc) throw new BadRequestException('Sube los dos ficheros: EAN.xlsm y UPC.xlsm.');

    try {
      console.log(`[maestro] import ejecutado por ${user.email} (${user.role})`); // trazabilidad mínima
      const useCase = new ImportMasterUseCase(new ExcelCodesReader(), new PrismaReferenceRepository(this.prisma));
      return await useCase.execute({ eanSource: ean.path, upcSource: upc.path });
    } finally {
      await Promise.all([ean, upc].map((f) => unlink(f.path).catch(() => undefined)));
    }
  }
}
