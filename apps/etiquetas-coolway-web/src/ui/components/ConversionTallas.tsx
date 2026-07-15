import { useMemo } from 'react';
import { Table } from 'react-bootstrap';
import type { LabelRowDto } from '@yorga/contracts';

/**
 * REQ-003 · Cuadro de conversión de tallas.
 *
 * En ropa, calcetines y bolsas un SKU tiene TRES tallas: la que viene en el PDF, la que se imprime
 * en la etiqueta y la que va al código de barras. La tabla de etiquetas **no puede mostrarlas** —sus
 * columnas son la entrada de otro proceso y no se tocan—, así que la conversión se explica aquí:
 * es lo que permite validar de un vistazo que cada código de barras es el que toca.
 *
 * En calzado las tres tallas coinciden y este cuadro no aparece.
 */
export function ConversionTallas({ rows }: { rows: LabelRowDto[] }) {
  const conversiones = useMemo(() => {
    const map = new Map<string, { style: string; ref: string; tallaSap: string; size: string; tallaTiendas: string; code128?: string }>();
    for (const r of rows) {
      if (!r.tallaSap || !r.tallaTiendas) continue; // calzado: nada que explicar
      const key = `${r.style}|${r.ref}|${r.tallaSap}`;
      if (!map.has(key)) {
        map.set(key, {
          style: r.style,
          ref: r.ref,
          tallaSap: r.tallaSap,
          size: r.size,
          tallaTiendas: r.tallaTiendas,
          code128: r.code128,
        });
      }
    }
    return [...map.values()].sort(
      (a, b) => a.style.localeCompare(b.style) || a.tallaSap.localeCompare(b.tallaSap, 'es', { numeric: true }),
    );
  }, [rows]);

  if (conversiones.length === 0) return null;

  return (
    <div className="conversion-box mb-3">
      <div className="small text-secondary mb-2">
        <strong>Conversión de tallas</strong> — en ropa, calcetines y bolsas un mismo producto tiene{' '}
        <strong>tres tallas</strong>: la que trae el PDF, la que se <strong>imprime</strong> en la etiqueta y la que va
        al <strong>código de barras</strong>. Se leen del maestro, nunca se calculan. Este cuadro está para poder
        comprobarlo de un vistazo.
      </div>

      <Table size="sm" borderless className="mb-0 missing-table">
        <thead>
          <tr className="small text-secondary">
            <th>modelo</th>
            <th>ref.</th>
            <th>talla en el PDF</th>
            <th>se imprime</th>
            <th>talla del código</th>
            <th>CODE128 resultante</th>
          </tr>
        </thead>
        <tbody>
          {conversiones.map((c) => (
            <tr key={`${c.style}-${c.ref}-${c.tallaSap}`} className="small">
              <td><strong>{c.style}</strong></td>
              <td>{c.ref}</td>
              <td>{c.tallaSap}</td>
              <td><strong>{c.size}</strong></td>
              <td>{c.tallaTiendas}</td>
              <td className="text-nowrap">{c.code128 ?? <span className="text-secondary">— (esta variante no lleva CODE128)</span>}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="small text-secondary mt-2">
        El CODE128 se compone como <strong>referencia (7 dígitos, con cero delante si le falta) + 00000 + talla del
        código</strong>.
      </div>
    </div>
  );
}
