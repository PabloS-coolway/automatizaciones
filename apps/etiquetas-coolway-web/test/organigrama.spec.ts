import { describe, expect, it } from 'vitest';
import type { EmployeeDto } from '@yorga/contracts';
import { construirOrganigrama } from '../src/domain/organigrama';

const emp = (p: Partial<EmployeeDto> & { id: number }): EmployeeDto => ({
  fullName: `E${p.id}`,
  email: `e${p.id}@y.com`,
  position: null,
  rrhhRole: 'EMPLEADO',
  managerId: null,
  active: true,
  department: null,
  departmentId: null,
  center: null,
  centerId: null,
  brand: null,
  ...p,
});

describe('construirOrganigrama', () => {
  it('anida el equipo bajo su responsable y segmenta por marca', () => {
    const plantilla = [
      emp({ id: 1, fullName: 'Ana', brand: 'COOLWAY' }),
      emp({ id: 2, fullName: 'Beto', managerId: 1, brand: 'COOLWAY' }),
      emp({ id: 3, fullName: 'Cira', managerId: 2, brand: 'COOLWAY' }), // nieto
      emp({ id: 4, fullName: 'Dora', brand: 'OTRA' }),
    ];
    const org = construirOrganigrama(plantilla);
    expect(org.map((r) => r.marca)).toEqual(['COOLWAY', 'OTRA']);
    const coolway = org[0].raices;
    expect(coolway).toHaveLength(1); // sólo Ana es raíz
    expect(coolway[0].empleado.fullName).toBe('Ana');
    expect(coolway[0].hijos[0].empleado.fullName).toBe('Beto');
    expect(coolway[0].hijos[0].hijos[0].empleado.fullName).toBe('Cira'); // nieto anidado
  });

  it('un empleado cuyo responsable NO está en la lista visible se trata como raíz (no queda huérfano)', () => {
    // Beto reporta a 99, que no está → Beto es raíz de su rama.
    const org = construirOrganigrama([emp({ id: 2, fullName: 'Beto', managerId: 99, brand: 'COOLWAY' })]);
    expect(org[0].raices[0].empleado.fullName).toBe('Beto');
  });

  it('los sin centro caen en "Sin marca asignada", y esa rama va al final', () => {
    const org = construirOrganigrama([emp({ id: 1, brand: 'COOLWAY' }), emp({ id: 2, brand: null })]);
    expect(org[org.length - 1].marca).toBe('Sin marca asignada');
  });

  it('no entra en bucle si llegara un ciclo (defensa)', () => {
    // 1→2 y 2→1: ninguno es raíz por managerId, pero la función no debe colgarse.
    const org = construirOrganigrama([emp({ id: 1, managerId: 2 }), emp({ id: 2, managerId: 1 })]);
    // Con ciclo puro no hay raíces por managerId: el resultado es vacío, pero termina.
    expect(Array.isArray(org)).toBe(true);
  });
});
