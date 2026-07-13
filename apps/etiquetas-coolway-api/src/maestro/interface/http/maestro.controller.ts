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
import {
  FacetsDto,
  ImportReportDto,
  MaestroStatsDto,
  REFERENCE_FACET_COLUMNS,
  ReferenceFiltersDto,
  ReferenceSortColumn,
  ReferencesPageDto,
  SeedReportDto,
  SortDir,
} from '@yorga/contracts';
import { MaestroQuery, esColumnaDeFacetas } from '../../application/maestro-query.service';
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
  references(@Query() q: Record<string, unknown>): Promise<ReferencesPageDto> {
    const take = Math.min(Math.max(Number(q.take) || 100, 1), 500);
    const skip = Math.max(Number(q.skip) || 0, 0);
    return this.query.references(parseFilters(q), take, skip);
  }

  /** Valores del desplegable de una columna, con los filtros de las demás aplicados (autofiltro Excel). */
  @Get('facets')
  facets(@Query() q: Record<string, unknown>): Promise<FacetsDto> {
    const column = String(q.column ?? '');
    // Se valida contra la lista blanca: agrupar por una columna arbitraria no es aceptable.
    if (!esColumnaDeFacetas(column)) {
      throw new BadRequestException(
        `No se puede filtrar por valores en la columna "${column}". Columnas válidas: ${REFERENCE_FACET_COLUMNS.join(', ')}.`,
      );
    }
    return this.query.facets(column, parseFilters(q));
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

/**
 * Un filtro de casillas puede venir de tres formas, y las tres significan cosas distintas:
 *   · ausente        → sin filtro (todas las filas)
 *   · `style=`       → selección VACÍA: no se quiere ningún valor → 0 filas
 *   · `style=A&style=B` → sólo esos valores
 * Confundir la segunda con la primera es justo el bug que tuvimos en el filtro del front.
 */
function asValores(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(String).filter((s) => s !== '');
  return String(v) === '' ? [] : [String(v)];
}

const asTexto = (v: unknown): string | undefined => (v === undefined ? undefined : String(v));

/** Filtros que llegan por query string. El `sort` se valida luego contra la lista blanca. */
function parseFilters(q: Record<string, unknown>): ReferenceFiltersDto {
  return {
    search: asTexto(q.search),
    style: asValores(q.style),
    color: asValores(q.color),
    size: asValores(q.size),
    colorNameWeb: asValores(q.colorNameWeb),
    ref: asTexto(q.ref),
    sku: asTexto(q.sku),
    ean13: asTexto(q.ean13),
    upc: asTexto(q.upc),
    sort: asTexto(q.sort) as ReferenceSortColumn | undefined,
    dir: (asTexto(q.dir) === 'desc' ? 'desc' : 'asc') as SortDir,
  };
}
