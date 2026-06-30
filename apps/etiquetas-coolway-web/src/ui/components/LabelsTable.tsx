import { Table } from 'react-bootstrap';
import type { LabelRowDto } from '@yorga/contracts';

/** Previsualización en línea de las filas de etiqueta (columnas de código según variante). */
export function LabelsTable({ rows }: { rows: LabelRowDto[] }) {
  const has = (k: keyof LabelRowDto) => rows.some((r) => r[k] != null && r[k] !== '');

  return (
    <div className="labels-preview">
      <Table size="sm" striped hover responsive className="mb-0">
        <thead>
          <tr>
            <th>style</th>
            <th>color</th>
            <th>ref.</th>
            <th>talla</th>
            <th>SKU</th>
            <th>QTY</th>
            {has('ean13') && <th>ean13</th>}
            {has('upc') && <th>upc</th>}
            {has('code128') && <th>code128</th>}
            {has('importadoPor') && <th>importado por</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.ref}-${r.size}-${i}`}>
              <td>{r.style}</td>
              <td>{r.color}</td>
              <td>{r.ref}</td>
              <td>{r.size}</td>
              <td>{r.sku}</td>
              <td>{r.qty}</td>
              {has('ean13') && <td>{r.ean13}</td>}
              {has('upc') && <td>{r.upc}</td>}
              {has('code128') && <td>{r.code128}</td>}
              {has('importadoPor') && <td>{r.importadoPor}</td>}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
}
