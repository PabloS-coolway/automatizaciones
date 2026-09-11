import { BadRequestException, Controller, Inject, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportFichasResultDto } from '@yorga/contracts';
import { CurrentUser, RequireFeature } from '../../../auth/interface/http/decorators';
import { JwtPayload } from '../../../auth/application/auth.service';
import { ACTIVITY_RECORDER, ActivityRecorder } from '../../../actividad/application/activity-recorder.port';
import { ImportFichasService } from '../../application/import-fichas.service';
import { FichasExcelInvalidoError, leerFichasDesdeBuffer } from '../../infrastructure/fichas-rrhh-excel-reader';

const MIME_EXCEL = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream', // algunos navegadores mandan esto para .xlsx
]);

/**
 * REQ-012 · Import de fichas de RRHH desde el Excel agrupado de Ángeles (12 columnas). Distinto del import de
 * usuarios de login: aquí la clave de negocio es (empresa + código de empleado) y se vuelca la ficha completa
 * (sociedad, zona, centro, catálogos) de forma idempotente. Vive en HTTP porque orquesta lectura + import.
 */
@RequireFeature('usuarios.gestionar')
@Controller('rrhh')
export class ImportFichasController {
  constructor(
    private readonly importador: ImportFichasService,
    @Inject(ACTIVITY_RECORDER) private readonly actividad: ActivityRecorder,
  ) {}

  @Post('import-fichas')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async importar(@UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() me: JwtPayload): Promise<ImportFichasResultDto> {
    if (!file) throw new BadRequestException('Falta el fichero Excel (campo "file").');
    if (file.mimetype && !MIME_EXCEL.has(file.mimetype)) throw new BadRequestException('El fichero debe ser un Excel (.xlsx).');

    let filas;
    try {
      filas = await leerFichasDesdeBuffer(file.buffer);
    } catch (e) {
      if (e instanceof FichasExcelInvalidoError) throw new BadRequestException(e.message);
      throw e;
    }

    const resultado = await this.importador.importar(filas);

    if (resultado.totales.creados > 0 || resultado.totales.actualizados > 0) {
      await this.actividad.record({
        actor: { userId: me.sub, email: me.email },
        action: 'CREATE',
        entity: 'USER',
        entityId: 'import-fichas',
        summary: `Importó fichas de RRHH: ${resultado.totales.creados} alta(s), ${resultado.totales.actualizados} actualizada(s)${resultado.totales.saltados ? `, ${resultado.totales.saltados} saltada(s)` : ''}`,
      });
    }

    return resultado;
  }
}
