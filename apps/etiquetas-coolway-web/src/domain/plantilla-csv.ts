import type { EmployeeDto } from '@yorga/contracts';

/** Escapa un campo CSV (separador `;`): si trae `;`, comillas o salto, lo entrecomilla. */
function campo(v: string): string {
  return /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/**
 * REQ-008 Fase 4 · Plantilla a CSV (informe para RRHH). Separador `;` para Excel en español. Una fila por
 * empleado con los datos de la ficha. Puro y testeado: es lo que RRHH se descarga.
 */
export function plantillaACsv(empleados: EmployeeDto[]): string {
  const cab = 'nombre;correo;puesto;rol;departamento;centro;marca;estado';
  const filas = empleados.map((e) =>
    [e.fullName, e.email, e.position ?? '', e.rrhhRole, e.department ?? '', e.center ?? '', e.brand ?? '', e.active ? 'activo' : 'baja']
      .map((c) => campo(String(c)))
      .join(';'),
  );
  return [cab, ...filas].join('\n');
}
