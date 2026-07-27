import type { DiaJornadaDto } from '@yorga/contracts';

/** "2h 35m" a partir de minutos. */
export function formatearMinutos(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/**
 * REQ-008 Fase 2 · Histórico personal a CSV (una fila por día). Separador `;` y horas con coma decimal, que es
 * lo que Excel en español espera. Cabecera incluida. Puro y testeado: es lo que el empleado se descarga.
 */
export function historicoACsv(dias: DiaJornadaDto[]): string {
  const cab = 'fecha;minutos;horas';
  const filas = dias.map((d) => `${d.fecha};${d.minutosTrabajados};${(d.minutosTrabajados / 60).toFixed(2).replace('.', ',')}`);
  return [cab, ...filas].join('\n');
}
