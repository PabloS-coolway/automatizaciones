import { CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { JwtPayload } from '../../../auth/application/auth.service';
import { EmployeeRow } from '../../application/ports';
import { RrhhService } from '../../application/rrhh.service';

/**
 * REQ-008 · Exige que el usuario autenticado TENGA ficha de empleado (es la puerta al módulo RRHH), y adjunta
 * su ficha a la petición como `rrhhActor`. La autenticación (quién eres) ya la resolvió el guard global; esto
 * es la segunda capa: si no eres empleado, no entras a RRHH.
 */
@Injectable()
export class RrhhGuard implements CanActivate {
  constructor(private readonly service: RrhhService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user as JwtPayload | undefined;
    if (!user) throw new ForbiddenException('No autenticado.');
    const employee = await this.service.me(user.sub);
    if (!employee) throw new ForbiddenException('No tienes ficha de empleado en RRHH.');
    req.rrhhActor = employee;
    return true;
  }
}

/** Inyecta la ficha del empleado autenticado (la pone `RrhhGuard`). */
export const RrhhActor = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EmployeeRow => ctx.switchToHttp().getRequest().rrhhActor,
);
