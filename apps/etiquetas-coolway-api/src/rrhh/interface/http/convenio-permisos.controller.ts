import { Controller, Get, NotFoundException, Param, ParseIntPipe } from '@nestjs/common';
import { EmpleadoPermisosDto } from '@yorga/contracts';
import { RequireFeature } from '../../../auth/interface/http/decorators';
import { ConvenioPermisosService } from '../../application/convenio-permisos.service';

/**
 * REQ-012 · Consulta de los permisos EFECTIVOS de un empleado (zona → convenio → permisos, con fallback al
 * catálogo global). Es la vista que hace útil el andamiaje convenio/zona: dado un trabajador, qué permisos tiene
 * de verdad hoy. Gestión de plantilla (RRHH/Admin), como el resto de datos sensibles de ficha.
 */
@RequireFeature('usuarios.gestionar')
@Controller('rrhh')
export class ConvenioPermisosController {
  constructor(private readonly service: ConvenioPermisosService) {}

  @Get('empleados/:id/permisos')
  async permisos(@Param('id', ParseIntPipe) id: number): Promise<EmpleadoPermisosDto> {
    const res = await this.service.permisosDeEmpleado(id);
    if (!res) throw new NotFoundException(`No existe el empleado ${id}.`);
    return res;
  }
}
