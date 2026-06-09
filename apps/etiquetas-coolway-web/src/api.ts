import type { GenerateLabelsHttpResponse, LabelVariant, MarketDto } from '@yorga/contracts';

export async function fetchMarkets(): Promise<MarketDto[]> {
  const res = await fetch('/api/markets');
  if (!res.ok) throw new Error('No se pudieron cargar los destinos');
  return (await res.json()).markets;
}

export async function generateLabels(params: {
  master: File;
  orders: File[];
  market?: string;
  variant?: LabelVariant;
  importadoPor?: string;
}): Promise<GenerateLabelsHttpResponse> {
  const fd = new FormData();
  fd.append('master', params.master);
  params.orders.forEach((o) => fd.append('orders', o));
  if (params.market) fd.append('market', params.market);
  if (params.variant) fd.append('variant', params.variant);
  if (params.importadoPor) fd.append('importadoPor', params.importadoPor);

  const res = await fetch('/api/labels/generate', { method: 'POST', body: fd });
  if (!res.ok) {
    let msg = 'Error generando etiquetas';
    try {
      const body = await res.json();
      msg = body.message ?? msg;
    } catch {
      /* noop */
    }
    throw new Error(msg);
  }
  return res.json();
}

/** Descarga un Excel recibido en base64. */
export function downloadBase64(fileName: string, base64: string): void {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
