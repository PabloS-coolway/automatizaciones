import { unlink } from 'node:fs/promises';
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
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
import { MAX_EXPORT, MaestroQuery, esColumnaDeFacetas } from '../../application/maestro-query.service';
import { MaestroExcelSerializer } from '../../infrastructure/maestro-excel-serializer';
import { ImportMasterUseCase } from '../../application/import-master.use-case';
import { SeedMasterUseCase } from '../../application/seed-master.use-case';
import { ExcelCodesReader } from '../../infrastructure/excel-codes-reader';
import { PrismaReferenceRepository } from '../../infrastructure/prisma-reference.repository';
import { PrismaService } from '../../../infrastructure/db/prisma.service';
import { ExcelMasterReader } from '../../../infrastructure/excel/excel-master-reader.adapter';
import { CurrentUser, RequireFeature } from '../../../auth/interface/http/decorators';
import { JwtPayload } from '../../../auth/application/auth.service';

type Uploaded = { ean?: Express.Multer.File[]; upc?: Express.Multer.File[] };

@Controller('maestro')
export class MaestroController {
  constructor(
    private readonly query: MaestroQuery,
    private readonly prisma: PrismaService,
    private readonly excel: MaestroExcelSerializer,
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

  /**
   * Exporta a Excel LA VISTA FILTRADA (los mismos filtros y orden que se ven en pantalla).
   * Se genera aquí, no en el navegador: puede ser el maestro entero (5.736 filas).
   * Lo puede usar un operador: es lectura, y es justo lo que necesita para trabajar en Excel.
   */
  @Get('export')
  async export(@Query() q: Record<string, unknown>, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const filters = parseFilters(q);
    const rows = await this.query.allForExport(filters);

    const filtrada = Object.entries(filters).some(([k, v]) => !['sort', 'dir'].includes(k) && v !== undefined);
    const fileName = this.excel.fileName(filtrada, new Date());

    if (rows.length === MAX_EXPORT) {
      // No se recorta en silencio: un Excel a medias es peor que ninguno.
      throw new BadRequestException(
        `La exportación supera el límite de ${MAX_EXPORT.toLocaleString('es-ES')} filas. Afina el filtro y vuelve a intentarlo.`,
      );
    }

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      // El navegador necesita ver esta cabecera para poder leer el nombre del fichero.
      'Access-Control-Expose-Headers': 'Content-Disposition',
    });
    return new StreamableFile(await this.excel.serialize(rows));
  }

  @RequireFeature('maestro.cargar') // cargar el maestro reescribe la fuente de verdad
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

  @RequireFeature('maestro.cargar') // importar sobrescribe el maestro
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

/** Tope de valores en un filtro de casillas (y `arrayLimit` de `qs`). `color web` ya tiene 408. */
export const MAX_VALORES_FILTRO = 2000;

/**
 * Un filtro de casillas puede venir de tres formas, y las tres significan cosas distintas:
 *   · ausente        → sin filtro (todas las filas)
 *   · `style=`       → selección VACÍA: no se quiere ningún valor → 0 filas
 *   · `style=A&style=B` → sólo esos valores
 * Confundir la segunda con la primera es justo el bug que tuvimos en el filtro del front.
 *
 * ⚠️ Además hay una CUARTA forma, y muerde: si `qs` supera su `arrayLimit`, en vez de un array
 * devuelve un OBJETO `{0:'A', 1:'B'}`. Con `color web` (408 valores) pasaba, y la tabla salía vacía
 * SIN ERROR (el objeto se convertía en la cadena "[object Object]", que no coincide con nada).
 * Se sube el límite en `main.ts`, pero aquí también se acepta la forma de objeto: si el parseo de la
 * query cambia, que no vuelva a fallar en silencio.
 */
export function asValores(v: unknown): string[] | undefined {
  if (v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(String).filter((s) => s !== '');
  if (typeof v === 'object' && v !== null) {
    return Object.values(v as Record<string, unknown>)
      .map(String)
      .filter((s) => s !== '');
  }
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
