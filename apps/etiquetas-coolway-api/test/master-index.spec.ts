import { MasterIndex } from '../src/domain/services/master-index';
import { MasterReference } from '../src/domain/model/reference';

/**
 * BUG-005 · GOAL GYS está re-referenciado: la talla 43 existe en DOS refs con la misma clave
 * (style, color, talla, género) — `8683709` (con EAN) y `8683549` (ref vieja, EAN vacío).
 * El índice indexaba con `set()` (last-write-wins): si la ref vacía entraba después, pisaba a la
 * buena y la talla salía como "faltante" aunque el código SÍ está en la BD.
 */
const conEan: MasterReference = {
  style: 'GOAL', color: 'GYS', ref: '8683709', size: '43',
  ean13: '8433852599736', upc: '843385222380',
};
const sinEan: MasterReference = { style: 'GOAL', color: 'GYS', ref: '8683549', size: '43' };

describe('MasterIndex · colisión de refs re-referenciadas (BUG-005)', () => {
  it('ante dos refs con la misma clave, se queda con la que TIENE código (venga en el orden que venga)', () => {
    // Se prueban los dos órdenes de inserción: el bug sólo se dispara cuando la vacía entra la última,
    // así que un test de un solo orden pasaría igual con el fallo. Aquí no se escapa.
    for (const rows of [[conEan, sinEan], [sinEan, conEan]]) {
      const idx = new MasterIndex(rows);
      const row = idx.find('GOAL', 'GYS', '43', 'M');
      expect(row?.ref).toBe('8683709');
      expect(row?.ean13).toBe('8433852599736');
    }
  });
});
