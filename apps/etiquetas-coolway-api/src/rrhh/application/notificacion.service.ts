import { Inject, Injectable } from '@nestjs/common';
import { NOTIFICATION_REPOSITORY, NotificationRepository, NotificationRow } from './ports';

/** REQ-008 Fase 4 · Avisos in-app del empleado. La generación vive en los servicios que disparan el evento. */
@Injectable()
export class NotificacionService {
  constructor(@Inject(NOTIFICATION_REPOSITORY) private readonly repo: NotificationRepository) {}

  listar(employeeId: number): Promise<NotificationRow[]> {
    return this.repo.listForEmployee(employeeId, 50);
  }

  noLeidas(employeeId: number): Promise<number> {
    return this.repo.countUnread(employeeId);
  }

  marcarLeida(id: number, employeeId: number): Promise<void> {
    return this.repo.markRead(id, employeeId);
  }

  marcarTodas(employeeId: number): Promise<void> {
    return this.repo.markAllRead(employeeId);
  }
}
