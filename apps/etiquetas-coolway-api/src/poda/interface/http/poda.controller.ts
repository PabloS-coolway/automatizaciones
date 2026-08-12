import { readFile, unlink } from 'node:fs/promises';
import { BadRequestException, Body, Controller, Inject, Post, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { PodaResponse, SOCIEDADES, SociedadCodigo } from '@yorga/contracts';
import { leerBorrador, BorradorInvalidoError } from '../../infrastructure/borrador-reader';
import { podarFicheros } from '../../application/podar-ficheros.use-case';
import { RefInvalidaError } from '../../domain/familia';
import { RequireFeature } from '../../../auth/interface/http/decorators';
import { SURTIDO_REPOSITORY, SurtidoRepository } from '../../../surtidos/application/ports';

type Subidos = { borrador?: Express.Multer.File[]; ficheros?: Express.Multer.File[] };

/**
 * REQ-005 · Poda los ficheros de SAP a lo realmente comprado. Requiere `maestro.cargar` (es una tarea de
 * alta en SAP, como cargar el maestro). Sube el **borrador** de prepedidos (Excel) y los **ficheros de SAP**
 * (.txt); devuelve cada uno podado + el informe.
 */
@RequireFeature('maestro.cargar')
@Controller('poda')
export class PodaController {
  constructor(@Inject(SURTIDO_REPOSITORY) private readonly surtidos: SurtidoRepository) {}

  @Post()
  @UseInterceptors(FileFieldsInterceptor([{ name: 'borrador', maxCount: 1 }, { name: 'ficheros', maxCount: 20 }]))
  async podar(
    @UploadedFiles() files: Subidos,
    @Body('sociedad') sociedadRaw?: string,
    @Body('aplicarSurtidos') aplicarSurtidosRaw?: string,
  ): Promise<PodaResponse> {
    const borradorFile = files.borrador?.[0];
    const ficheros = files.ficheros ?? [];
    if (!borradorFile) throw new BadRequestException('Falta el borrador de prepedidos (Excel).');
    if (ficheros.length === 0) throw new BadRequestException('Sube al menos un fichero de SAP (.txt).');

    // REQ-010 · sociedad opcional; si viene, debe ser una del catálogo cerrado (no texto libre).
    let sociedad: SociedadCodigo | undefined;
    if (sociedadRaw) {
      const encontrada = SOCIEDADES.find((s) => s.codigo === sociedadRaw);
      if (!encontrada) throw new BadRequestException(`Sociedad desconocida: "${sociedadRaw}".`);
      sociedad = encontrada.codigo;
    }

    try {
      const borrador = await leerBorrador(borradorFile.path);
      // Los ficheros de SAP son latin1 (exports de SAP): se leen y se reescriben en la misma codificación.
      const entradas = await Promise.all(
        ficheros.map(async (f) => ({ nombre: f.originalname, contenido: await readFile(f.path, 'latin1') })),
      );

      // REQ-011 · sólo si se activa, se carga el catálogo de surtidos por grupo; la poda deja sólo los del
      // grupo del prefijo de cada familia. Sin activar, se conservan todos (comportamiento de REQ-005).
      const aplicarSurtidos = aplicarSurtidosRaw === 'true' || aplicarSurtidosRaw === '1';
      const surtidos = aplicarSurtidos
        ? (await this.surtidos.findAll()).map((s) => ({ grupo: s.grupo, codigo: s.codigo }))
        : undefined;

      const { compras, ficheros: podados, sinReconocer, comprasSinColor } = podarFicheros(
        borrador,
        entradas,
        sociedad,
        surtidos,
      );
      return {
        compras: compras.length,
        sinReconocer,
        comprasSinColor,
        ficheros: podados.map((p) => ({
          nombre: p.nombre,
          tipo: p.tipo,
          conservadas: p.conservadas,
          retiradas: p.retiradas,
          compradoQueFalta: p.compradoQueFalta,
          sociedadSospechosa: p.sociedadSospechosa,
          surtidosGenerados: p.surtidosGenerados,
          podadoBase64: Buffer.from(p.podado, 'latin1').toString('base64'),
        })),
      };
    } catch (err) {
      // Una ref con formato inesperado en el borrador es un dato malo, no un fallo del servidor: se dice cuál.
      if (err instanceof RefInvalidaError) throw new BadRequestException(err.message);
      // BUG-009 · Un borrador con la cabecera inesperada (sin «Suma»/«Our Reference») se avisa, no se traga.
      if (err instanceof BorradorInvalidoError) throw new BadRequestException(err.message);
      throw err;
    } finally {
      const subidos = [borradorFile, ...ficheros].filter((f): f is Express.Multer.File => !!f);
      await Promise.all(subidos.map((f) => unlink(f.path).catch(() => undefined)));
    }
  }
}
