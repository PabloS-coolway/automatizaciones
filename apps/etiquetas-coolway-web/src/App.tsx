import { useEffect, useState } from 'react';
import type { GeneratedFileDto, MarketDto } from '@yorga/contracts';
import { downloadBase64, fetchMarkets, generateLabels } from './api';

export function App() {
  const [markets, setMarkets] = useState<MarketDto[]>([]);
  const [market, setMarket] = useState('VALENCIA');
  const [master, setMaster] = useState<File | null>(null);
  const [orders, setOrders] = useState<File[]>([]);
  const [importadoPor, setImportadoPor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [files, setFiles] = useState<GeneratedFileDto[]>([]);

  useEffect(() => {
    fetchMarkets().then(setMarkets).catch((e) => setError(e.message));
  }, []);

  const selected = markets.find((m) => m.code === market);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFiles([]);
    if (!master) return setError('Sube el Excel maestro.');
    if (orders.length === 0) return setError('Sube al menos un PDF de pedido.');

    setLoading(true);
    try {
      const res = await generateLabels({ master, orders, market, importadoPor: importadoPor || undefined });
      setFiles(res.files);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>Etiquetas Coolway</h1>
      <p className="sub">Sube el pedido(s) de SAP y el maestro, elige el destino y descarga las etiquetas.</p>

      <form onSubmit={onSubmit} className="card">
        <label>
          Destino
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            {markets.map((m) => (
              <option key={m.code} value={m.code}>
                {m.code} — {m.variant} · importado por {m.importadoPor}
              </option>
            ))}
          </select>
        </label>

        <label>
          Excel maestro (REFERENCIAS COOLWAY)
          <input type="file" accept=".xlsx,.xlsm" onChange={(e) => setMaster(e.target.files?.[0] ?? null)} />
        </label>

        <label>
          PDFs de pedido de compra (uno o varios)
          <input type="file" accept=".pdf" multiple onChange={(e) => setOrders(Array.from(e.target.files ?? []))} />
        </label>

        <label>
          Importado por (opcional, sobrescribe el del destino)
          <input
            type="text"
            placeholder={selected?.importadoPor ?? ''}
            value={importadoPor}
            onChange={(e) => setImportadoPor(e.target.value)}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? 'Generando…' : `Generar etiquetas${orders.length ? ` (${orders.length} pedido${orders.length > 1 ? 's' : ''})` : ''}`}
        </button>
      </form>

      {error && <p className="error">⚠ {error}</p>}

      {files.length > 0 && (
        <section className="card">
          <div className="results-head">
            <h2>Resultados</h2>
            <button onClick={() => files.forEach((f) => downloadBase64(f.fileName, f.fileBase64))}>Descargar todo</button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Pares</th>
                <th>Cuadre</th>
                <th>Faltantes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.orderNumber} className={f.reconciliation.balanced && f.missing.length === 0 ? '' : 'warn'}>
                  <td>{f.orderNumber}</td>
                  <td>{f.reconciliation.labelPairs}</td>
                  <td>{f.reconciliation.balanced ? '✔' : `✖ desfase ${f.reconciliation.diff}`}</td>
                  <td>{f.missing.length || '—'}</td>
                  <td>
                    <button onClick={() => downloadBase64(f.fileName, f.fileBase64)}>Descargar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </main>
  );
}
