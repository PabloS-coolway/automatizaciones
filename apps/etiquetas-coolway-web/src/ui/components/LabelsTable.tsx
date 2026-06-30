import { useMemo, useState } from 'react';
import { Button, Form, InputGroup, Table } from 'react-bootstrap';
import { ClipboardCheck, Clipboard as ClipboardIcon, Download, Search } from 'react-bootstrap-icons';
import type { LabelRowDto } from '@yorga/contracts';

type Col = { key: keyof LabelRowDto; label: string };

const BASE: Col[] = [
  { key: 'style', label: 'style' },
  { key: 'color', label: 'color' },
  { key: 'ref', label: 'ref.' },
  { key: 'size', label: 'talla' },
  { key: 'sku', label: 'SKU' },
  { key: 'qty', label: 'QTY' },
];
const OPTIONAL: Col[] = [
  { key: 'ean13', label: 'ean13' },
  { key: 'upc', label: 'upc' },
  { key: 'code128', label: 'code128' },
  { key: 'importadoPor', label: 'importado por' },
];

export function LabelsTable({ rows, fileName }: { rows: LabelRowDto[]; fileName: string }) {
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('');
  const [copied, setCopied] = useState(false);

  const cols = useMemo(
    () => [...BASE, ...OPTIONAL.filter((c) => rows.some((r) => r[c.key] != null && r[c.key] !== ''))],
    [rows],
  );
  const sizes = useMemo(() => [...new Set(rows.map((r) => r.size))].sort((a, b) => Number(a) - Number(b)), [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (size && r.size !== size) return false;
      if (!q) return true;
      return cols.some((c) => String(r[c.key] ?? '').toLowerCase().includes(q));
    });
  }, [rows, cols, query, size]);

  const toTable = (sep: string) =>
    [cols.map((c) => c.label).join(sep), ...filtered.map((r) => cols.map((c) => String(r[c.key] ?? '')).join(sep))].join('\n');

  const copy = async () => {
    await navigator.clipboard.writeText(toTable('\t'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const exportCsv = () => {
    const csv = toTable(';');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.replace(/\.xlsx$/i, '') + '.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="d-flex flex-wrap gap-2 align-items-center mb-2">
        <InputGroup size="sm" style={{ maxWidth: 240 }}>
          <InputGroup.Text>
            <Search aria-hidden="true" />
          </InputGroup.Text>
          <Form.Control placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar en la tabla" />
        </InputGroup>
        <Form.Select size="sm" style={{ maxWidth: 130 }} value={size} onChange={(e) => setSize(e.target.value)} aria-label="Filtrar por talla">
          <option value="">Toda talla</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              Talla {s}
            </option>
          ))}
        </Form.Select>
        <span className="text-secondary small">
          {filtered.length} de {rows.length} filas
        </span>
        <div className="ms-auto d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={copy}>
            {copied ? <ClipboardCheck className="me-1" /> : <ClipboardIcon className="me-1" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
          <Button variant="outline-secondary" size="sm" onClick={exportCsv}>
            <Download className="me-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="labels-preview">
        <Table size="sm" striped hover responsive className="mb-0">
          <thead>
            <tr>
              {cols.map((c) => (
                <th key={c.key}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={`${r.ref}-${r.size}-${i}`}>
                {cols.map((c) => (
                  <td key={c.key}>{r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
