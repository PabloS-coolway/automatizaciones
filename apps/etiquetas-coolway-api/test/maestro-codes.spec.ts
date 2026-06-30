import { buildSku, mergeCodes, CodeRow } from '../src/maestro/domain/codes';

const ean = (ref: string, size: string, code: string, style = 'GOAL', color = 'BLK'): CodeRow => ({ style, color, ref, size, code });

describe('mergeCodes (Bloque 1+2)', () => {
  it('une EAN+UPC por (ref,talla), calcula SKU y no marca incidencias si todo es válido', () => {
    const { references, issues } = mergeCodes(
      [ean('7603546', '36', '8433852661655')],
      [ean('7603546', '36', '843385252578')],
    );
    expect(references).toHaveLength(1);
    expect(references[0]).toMatchObject({ ref: '7603546', size: '36', sku: '7603546-36', ean13: '8433852661655', upc: '843385252578' });
    expect(issues).toHaveLength(0);
  });

  it('reporta UPC faltante', () => {
    const { issues } = mergeCodes([ean('7603546', '37', '8433852661662')], []);
    expect(issues).toEqual([{ ref: '7603546', size: '37', reason: 'missing_upc' }]);
  });

  it('reporta formato inválido de EAN13', () => {
    const { issues } = mergeCodes([ean('7603546', '38', '123')], [ean('7603546', '38', '843385252592')]);
    expect(issues).toContainEqual({ ref: '7603546', size: '38', reason: 'invalid_ean13', detail: '123' });
  });

  it('buildSku compone ref-talla', () => {
    expect(buildSku('7603546', '40')).toBe('7603546-40');
  });
});
