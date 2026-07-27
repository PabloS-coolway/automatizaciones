/**
 * REQ-008 · Fase 0 — Roles del módulo RRHH y visibilidad jerárquica.
 *
 * Autorización en dos capas: el login dice QUIÉN eres; esto decide QUÉ ves dentro de RRHH. **No** reutiliza
 * REQ-006: aquí la visibilidad es **jerárquica por organigrama** (un responsable sólo ve su rama), no un
 * catálogo de features. Es una función pura a propósito — es la regla sensible del módulo, así que vive
 * testeada aparte del guard y de Prisma.
 */

export const RRHH_ROLES = ['EMPLEADO', 'MANAGER', 'RRHH', 'ADMIN'] as const;
export type RrhhRole = (typeof RRHH_ROLES)[number];

export function esRrhhRole(x: string): x is RrhhRole {
  return (RRHH_ROLES as readonly string[]).includes(x);
}

/** Los roles que gestionan la plantilla completa (ven a todos y administran). */
export function gestionaPlantilla(role: RrhhRole): boolean {
  return role === 'RRHH' || role === 'ADMIN';
}

/** Nodo mínimo del organigrama para calcular visibilidad (id del empleado + su responsable). */
export interface OrgNode {
  id: number;
  managerId: number | null;
}

/**
 * IDs de empleados que `actor` puede VER, dado el organigrama:
 * - **RRHH / ADMIN** → toda la plantilla.
 * - **MANAGER** → él mismo y **todo su subárbol** (su equipo directo e indirecto).
 * - **EMPLEADO** → sólo a sí mismo.
 */
export function empleadosVisibles(actor: { id: number; rrhhRole: RrhhRole }, org: OrgNode[]): Set<number> {
  if (gestionaPlantilla(actor.rrhhRole)) return new Set(org.map((n) => n.id));

  const visibles = new Set<number>([actor.id]);
  if (actor.rrhhRole !== 'MANAGER') return visibles; // EMPLEADO: sólo él

  // MANAGER: BFS hacia abajo por el organigrama (quién reporta a quién).
  const hijosDe = new Map<number, number[]>();
  for (const n of org) {
    if (n.managerId != null) {
      const arr = hijosDe.get(n.managerId) ?? [];
      arr.push(n.id);
      hijosDe.set(n.managerId, arr);
    }
  }
  const cola = [actor.id];
  while (cola.length) {
    const actual = cola.shift() as number;
    for (const hijo of hijosDe.get(actual) ?? []) {
      if (!visibles.has(hijo)) {
        visibles.add(hijo);
        cola.push(hijo);
      }
    }
  }
  return visibles;
}

/** ¿`actor` puede ver a `targetId`? */
export function puedeVer(actor: { id: number; rrhhRole: RrhhRole }, targetId: number, org: OrgNode[]): boolean {
  return empleadosVisibles(actor, org).has(targetId);
}

/**
 * ¿Poner a `nuevoManagerId` como responsable de `empleadoId` crearía un **ciclo** en el organigrama? Lo haría
 * si el nuevo responsable es el propio empleado o alguien de su subárbol (un subordinado, directo o indirecto).
 * Se comprueba para no dejar un organigrama imposible (A manda a B y B manda a A).
 */
export function crearíaCiclo(empleadoId: number, nuevoManagerId: number, org: OrgNode[]): boolean {
  return empleadosVisibles({ id: empleadoId, rrhhRole: 'MANAGER' }, org).has(nuevoManagerId);
}
