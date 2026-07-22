import { readFile, unlink } from 'node:fs/promises';
import { BadRequestException, Controller, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PodaResponse } from '@yorga/contracts';
import { leerBorrador } from '../../infrastructure/borrador-reader';
import { podarFicheros } from '../../application/podar-ficheros.use-case';
import { RefInvalidaError } from '../../domain/familia';
import { RequireFeature } from '../../../auth/interface/http/decorators';

type Subidos = { borrador?: Express.Multer.File[]; ficheros?: Express.Multer.File[] };

/**
 * REQ-005 · Poda los ficheros de SAP a lo realmente comprado. Requiere `maestro.cargar` (es una tarea de
 * alta en SAP, como cargar el maestro). Sube el **borrador** de prepedidos (Excel) y los **ficheros de SAP**
 * (.txt); devuelve cada uno podado + el informe.
 */
@RequireFeature('maestro.cargar')
@Controller('poda')
export class PodaController {
  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'borrador', maxCount: 1 }, { name: 'ficheros', maxCount: 20 }]))
  async podar(@UploadedFiles() files: Subidos): Promise<PodaResponse> {
    const borradorFile = files.borrador?.[0];
    const ficheros = files.ficheros ?? [];
    if (!borradorFile) throw new BadRequestException('Falta el borrador de prepedidos (Excel).');
    if (ficheros.length === 0) throw new BadRequestException('Sube al menos un fichero de SAP (.txt).');

    try {
      const borrador = await leerBorrador(borradorFile.path);
      // Los ficheros de SAP son latin1 (exports de SAP): se leen y se reescriben en la misma codificación.
      const entradas = await Promise.all(
        ficheros.map(async (f) => ({ nombre: f.originalname, contenido: await readFile(f.path, 'latin1') })),
      );

      const { compras, ficheros: podados, sinReconocer } = podarFicheros(borrador, entradas);
      return {
        compras: compras.length,
        sinReconocer,
        ficheros: podados.map((p) => ({
          nombre: p.nombre,
          tipo: p.tipo,
          conservadas: p.conservadas,
          retiradas: p.retiradas,
          compradoQueFalta: p.compradoQueFalta,
          podadoBase64: Buffer.from(p.podado, 'latin1').toString('base64'),
        })),
      };
    } catch (err) {
      // Una ref con formato inesperado en el borrador es un dato malo, no un fallo del servidor: se dice cuál.
      if (err instanceof RefInvalidaError) throw new BadRequestException(err.message);
      throw err;
    } finally {
      const subidos = [borradorFile, ...ficheros].filter((f): f is Express.Multer.File => !!f);
      await Promise.all(subidos.map((f) => unlink(f.path).catch(() => undefined)));
    }
  }
}
