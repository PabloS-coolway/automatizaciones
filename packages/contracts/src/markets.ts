import { LabelVariant } from './variants';

/** Mercado de destino del pedido. */
export type MarketCode = 'VALENCIA' | 'USA' | 'AUSTRALIA' | 'ITALIA' | 'UK' | 'COSTA_RICA';

export interface MarketPreset {
  variant: LabelVariant;
  importadoPor: string;
}

/**
 * RF-14 · Preset destino → variante + importado por (confirmado por Silvia).
 * Valencia/tiendas: CODE128+EAN · USA: UPC+EAN · Australia: UPC · Italia/UK/Costa Rica: EAN.
 */
export const MARKETS: Record<MarketCode, MarketPreset> = {
  VALENCIA: { variant: 'CODE128_EAN', importadoPor: 'VANYOR S.A.U' },
  USA: { variant: 'UPC_EAN', importadoPor: 'COOLWAY USA LLC' },
  AUSTRALIA: { variant: 'UPC', importadoPor: 'Australia' },
  ITALIA: { variant: 'EAN', importadoPor: 'Italia' },
  UK: { variant: 'EAN', importadoPor: 'UK' },
  COSTA_RICA: { variant: 'EAN', importadoPor: 'Costa Rica' },
};

export const MARKET_CODES = Object.keys(MARKETS) as MarketCode[];

export function resolveMarket(code: string): MarketPreset {
  const preset = MARKETS[code.toUpperCase() as MarketCode];
  if (!preset) {
    throw new Error(`Mercado desconocido: "${code}". Válidos: ${MARKET_CODES.join(', ')}`);
  }
  return preset;
}
