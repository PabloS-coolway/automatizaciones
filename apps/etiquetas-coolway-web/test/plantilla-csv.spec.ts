import { describe, expect, it } from 'vitest';
import type { EmployeeDto } from '@yorga/contracts';
import { plantillaACsv } from '../src/domain/plantilla-csv';

const emp = (p: Partial<EmployeeDto> & { id: number }): EmployeeDto => ({
  fullName: 'Ana García', email: 'ana@y.com', position: 'Dependienta', rrhhRole: 'EMPLEADO', managerId: null,
  active: true, department: 'Ventas', departmentId: 1, center: 'Tienda', centerId: 1, brand: 'COOLWAY',
  weeklyMinutes: null, annualLeaveDays: null, ...p,
});

describe('plantillaACsv', () => {
  it('cabecera + una fila por empleado', () => {
    const csv = plantillaACsv([emp({ id: 1 })]);
    const lineas = csv.split('\n');
    expect(lineas[0]).toBe('nombre;correo;puesto;rol;departamento;centro;marca;estado');
    expect(lineas[1]).toBe('Ana García;ana@y.com;Dependienta;EMPLEADO;Ventas;Tienda;COOLWAY;activo');
  });

  it('entrecomilla los campos con punto y coma', () => {
    const csv = plantillaACsv([emp({ id: 1, position: 'Jefa; y más' })]);
    expect(csv.split('\n')[1]).toContain('"Jefa; y más"');
  });

  it('marca baja cuando el empleado está inactivo', () => {
    expect(plantillaACsv([emp({ id: 1, active: false })]).split('\n')[1]).toContain(';baja');
  });
});
