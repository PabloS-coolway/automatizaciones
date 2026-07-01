import { useEffect, useMemo, useState } from 'react';
import { Button, Form, InputGroup, Pagination, Table } from 'react-bootstrap';
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

const PAGE_SIZE = 50;

function pageWindow(current: number, totalPages: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - current) <= 1) out.push(p);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
}

export function LabelsTable({ rows, fileName }: { rows: LabelRowDto[]; fileName: string }) {
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('');
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);

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

  useEffect(() => setPage(1), [query, size]);

  const pairs = filtered.reduce((s, r) => s + r.qty, 0);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toTable = (sep: string) =>
    [cols.map((c) => c.label).join(sep), ...filtered.map((r) => cols.map((c) => String(r[c.key] ?? '')).join(sep))].join('\n');

  const copy = async () => {
    await navigator.clipboard.writeText(toTable('\t'));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const exportCsv = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + toTable(';')], { type: 'text/csv;charset=utf-8' }));
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
          {filtered.length} talla{filtered.length !== 1 ? 's' : ''} · {pairs} pares
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
            {paged.map((r, i) => (
              <tr key={`${r.ref}-${r.size}-${i}`}>
                {cols.map((c) => (
                  <td key={c.key}>{r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mt-2">
          <span className="text-secondary small">Página {page} de {totalPages}</span>
          <Pagination size="sm" className="mb-0">
            <Pagination.Prev disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
            {pageWindow(page, totalPages).map((p, i) =>
              p === '…' ? (
                <Pagination.Ellipsis key={`e${i}`} disabled />
              ) : (
                <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>
                  {p}
                </Pagination.Item>
              ),
            )}
            <Pagination.Next disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} />
          </Pagination>
        </div>
      )}
    </div>
  );
}
