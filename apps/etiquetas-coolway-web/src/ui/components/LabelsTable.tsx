import { useMemo, useState } from 'react';
import { Button } from 'react-bootstrap';
import { ClipboardCheck, Clipboard as ClipboardIcon, Download } from 'react-bootstrap-icons';
import type { LabelRowDto } from '@yorga/contracts';
import { Column, DataTable, useMemoryTable } from './table';

type Def = { key: keyof LabelRowDto; label: string };

const BASE: Def[] = [
  { key: 'style', label: 'style' },
  { key: 'color', label: 'color' },
  { key: 'ref', label: 'ref.' },
  { key: 'size', label: 'talla' },
  { key: 'sku', label: 'SKU' },
  { key: 'qty', label: 'QTY' },
];
/**
 * ⚠️ Las columnas de esta tabla NO se tocan: el fichero es la ENTRADA de otro proceso.
 * La conversión de tallas (REQ-003) se explica en un cuadro aparte, `ConversionTallas`.
 */
const OPCIONALES: Def[] = [
  { key: 'ean13', label: 'ean13' },
  { key: 'upc', label: 'upc' },
  { key: 'code128', label: 'code128' },
  { key: 'importadoPor', label: 'importado por' },
];

export function LabelsTable({ rows, fileName }: { rows: LabelRowDto[]; fileName: string }) {
  const [copied, setCopied] = useState(false);

  // Sólo se muestran las columnas opcionales que traen algo (la variante decide qué códigos hay).
  const defs = useMemo(
    () => [...BASE, ...OPCIONALES.filter((c) => rows.some((r) => r[c.key] != null && r[c.key] !== ''))],
    [rows],
  );

  const columns = useMemo<Column<LabelRowDto>[]>(
    () => defs.map((d) => ({ key: d.key, label: d.label, value: (r) => r[d.key] as string | number | undefined })),
    [defs],
  );

  const model = useMemoryTable(rows, columns);

  const pares = model.allFilteredRows().reduce((s, r) => s + r.qty, 0);

  /** Copiar/exportar lo que se VE (filtrado y ordenado), no el listado entero: es lo que espera quien filtra. */
  const comoTexto = (sep: string) =>
    [
      defs.map((c) => c.label).join(sep),
      ...model.allFilteredRows().map((r) => defs.map((c) => String(r[c.key] ?? '')).join(sep)),
    ].join('\n');

  const copiar = async () => {
    await navigator.clipboard.writeText(comoTexto('\t'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const exportarCsv = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + comoTexto(';')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.xlsx$/i, '') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
        <span className="text-secondary small">
          {model.filteredCount} talla{model.filteredCount !== 1 ? 's' : ''} · <strong>{pares}</strong> pares
          {model.activeFilterCount > 0 && ' (con el filtro aplicado)'}
        </span>
        <div className="ms-auto d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={copiar}>
            {copied ? <ClipboardCheck className="me-1" /> : <ClipboardIcon className="me-1" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={exportarCsv}>
            <Download className="me-1" /> CSV
          </Button>
        </div>
      </div>

      <DataTable
        model={model}
        allRows={rows}
        rowKey={(r, i) => `${r.ref}-${r.size}-${i}`}
        empty="Ninguna etiqueta cumple el filtro."
      />
    </div>
  );
}
