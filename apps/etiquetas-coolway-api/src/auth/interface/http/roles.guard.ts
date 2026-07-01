import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@yorga/contracts';
import { JwtPayload } from '../../application/auth.service';
import { ROLES_KEY } from './decorators';

/** Guard global: si la ruta declara @Roles, exige que el usuario tenga uno de ellos. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!roles || roles.length === 0) return true; // sin @Roles → basta con estar autenticado

    const user = ctx.switchToHttp().getRequest().user as JwtPayload | undefined;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta acción.');
    }
    return true;
  }
}
