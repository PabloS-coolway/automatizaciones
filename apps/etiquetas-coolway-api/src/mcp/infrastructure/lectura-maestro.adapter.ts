import { DestinationRepository } from '../../destinos/application/ports';
import { SurtidoRepository } from '../../surtidos/application/ports';
import { MaestroQuery } from '../../maestro/application/maestro-query.service';
import { DestinoLectura, LecturaMaestroPort, SurtidoLectura } from '../application/ports';

/**
 * Adapter: el puerto de lectura del MCP sobre lo que YA existe (las mismas consultas que usa la web del
 * maestro y los mismos repositorios de destinos y surtidos). No hay SQL propio aquí: si cambia cómo se
 * filtra el maestro, cambia igual para la web y para el MCP.
 */
export class LecturaMaestroAdapter implements LecturaMaestroPort {
  constructor(
    private readonly maestro: MaestroQuery,
    private readonly destinosRepo: DestinationRepository,
    private readonly surtidosRepo: SurtidoRepository,
  ) {}

  estadisticas: LecturaMaestroPort['estadisticas'] = () => this.maestro.stats();
  contar: LecturaMaestroPort['contar'] = (f) => this.maestro.count(f);
  referencias: LecturaMaestroPort['referencias'] = (f, take, skip) => this.maestro.references(f, take, skip);
  facetas: LecturaMaestroPort['facetas'] = (col, f) => this.maestro.facets(col, f);
  skus: LecturaMaestroPort['skus'] = (f, max) => this.maestro.skus(f, max);

  async destinos(): Promise<DestinoLectura[]> {
    // Se copia campo a campo: que un campo nuevo del repositorio no salga por el MCP sin decidirlo.
    return (await this.destinosRepo.findAll()).map((d) => ({
      code: d.code,
      name: d.name,
      variant: d.variant,
      importadoPor: d.importadoPor,
      active: d.active,
    }));
  }

  async surtidos(): Promise<SurtidoLectura[]> {
    return (await this.surtidosRepo.findAll()).map((s) => ({ grupo: s.grupo, codigo: s.codigo }));
  }
}
