import { empleadosVisibles, esRrhhRole, gestionaPlantilla, puedeVer, OrgNode } from '../src/rrhh/domain/rrhh-org';

/**
 * Organigrama de prueba:
 *   1 (RRHH)      7 (dirección, sin jefe)
 *   2 (MANAGER, jefe=7)
 *     ├ 3 (EMPLEADO, jefe=2)
 *     ├ 4 (EMPLEADO, jefe=2)
 *     └ 8 (EMPLEADO, jefe=3)   ← indirecto (nieto de 2)
 *   5 (MANAGER, jefe=7)
 *     └ 6 (EMPLEADO, jefe=5)
 */
const ORG: OrgNode[] = [
  { id: 1, managerId: null },
  { id: 7, managerId: null },
  { id: 2, managerId: 7 },
  { id: 3, managerId: 2 },
  { id: 4, managerId: 2 },
  { id: 8, managerId: 3 },
  { id: 5, managerId: 7 },
  { id: 6, managerId: 5 },
];

describe('rrhh-org · visibilidad jerárquica (REQ-008 Fase 0)', () => {
  it('RRHH y ADMIN ven a TODA la plantilla', () => {
    expect(empleadosVisibles({ id: 1, rrhhRole: 'RRHH' }, ORG)).toEqual(new Set([1, 7, 2, 3, 4, 8, 5, 6]));
    expect(empleadosVisibles({ id: 1, rrhhRole: 'ADMIN' }, ORG).size).toBe(8);
  });

  it('un EMPLEADO sólo se ve a sí mismo', () => {
    expect([...empleadosVisibles({ id: 3, rrhhRole: 'EMPLEADO' }, ORG)]).toEqual([3]);
  });

  it('un MANAGER ve su rama COMPLETA (directos e indirectos), y NO a los de otra rama', () => {
    const vis = empleadosVisibles({ id: 2, rrhhRole: 'MANAGER' }, ORG);
    // su subárbol: él, 3, 4 y el nieto 8
    expect(vis).toEqual(new Set([2, 3, 4, 8]));
    // NO ve la otra rama (5, 6), ni a su jefe (7), ni a RRHH (1)
    expect(vis.has(5)).toBe(false);
    expect(vis.has(6)).toBe(false);
    expect(vis.has(7)).toBe(false);
    // Romper el BFS del MANAGER (p.ej. dejar sólo directos, o devolver todos) hace caer este test.
  });

  it('puedeVer combina rol y rama', () => {
    expect(puedeVer({ id: 2, rrhhRole: 'MANAGER' }, 8, ORG)).toBe(true); // nieto
    expect(puedeVer({ id: 2, rrhhRole: 'MANAGER' }, 6, ORG)).toBe(false); // otra rama
    expect(puedeVer({ id: 1, rrhhRole: 'RRHH' }, 6, ORG)).toBe(true); // RRHH ve a todos
  });

  it('helpers de rol', () => {
    expect(gestionaPlantilla('RRHH')).toBe(true);
    expect(gestionaPlantilla('MANAGER')).toBe(false);
    expect(esRrhhRole('MANAGER')).toBe(true);
    expect(esRrhhRole('JEFE')).toBe(false);
  });
});
