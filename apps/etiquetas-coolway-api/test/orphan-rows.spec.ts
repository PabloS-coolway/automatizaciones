import { findOrphanRows } from '../src/maestro/application/orphan-rows';
import { SeedRow } from '../src/maestro/application/ports';

const fila = (style: string, color: string, ref: string, size: string): SeedRow => ({
  style, color, ref, size, sku: `${ref}-${size}`,
});
const enBd = (style: string, color: string, ref: string, size: string) => ({ style, color, ref, size });

describe('findOrphanRows · qué se borra al cargar el maestro', () => {
  it('EL CASO REAL: corregir la talla de la mochila borra la fila vieja', () => {
    // Silvia cambió SIZE de 35 → U. La corregida es una fila nueva; la vieja se quedaba y GANABA
    // al generar (ambas tienen talla SAP C01), así que la etiqueta seguía imprimiendo "35".
    const excel = [fila('BACKPACK', 'BLK', '308280', 'U')];
    const bd = [enBd('BACKPACK', 'BLK', '308280', 'U'), enBd('BACKPACK', 'BLK', '308280', '35')];

    expect(findOrphanRows(bd, excel)).toEqual([
      { style: 'BACKPACK', color: 'BLK', ref: '308280', size: '35' },
    ]);
  });

  it('NO borra nada de un producto que el Excel no trae (la salvaguarda de GOAL)', () => {
    // La hoja GOAL no se leyó una vez por una cabecera rota. Si borrásemos todo lo ausente,
    // habrían desaparecido sus 1.343 filas. Al no venir el producto, no se toca.
    const excel = [fila('BACKPACK', 'BLK', '308280', 'U')];
    const bd = [
      enBd('BACKPACK', 'BLK', '308280', 'U'),
      enBd('GOAL', 'RED', '7603298', '40'), // GOAL no viene en el Excel
      enBd('GOAL', 'RED', '7603298', '41'),
    ];

    expect(findOrphanRows(bd, excel)).toEqual([]);
  });

  it('sin huérfanas, no borra nada', () => {
    const excel = [fila('NILO', 'RED', '7603398', '40')];
    expect(findOrphanRows([enBd('NILO', 'RED', '7603398', '40')], excel)).toEqual([]);
  });

  it('una talla retirada de un producto que SÍ viene, se borra', () => {
    const excel = [fila('NILO', 'RED', '7603398', '40')];
    const bd = [enBd('NILO', 'RED', '7603398', '40'), enBd('NILO', 'RED', '7603398', '41')];

    expect(findOrphanRows(bd, excel)).toEqual([
      { style: 'NILO', color: 'RED', ref: '7603398', size: '41' },
    ]);
  });

  it('el mismo producto en OTRO color no se ve afectado', () => {
    const excel = [fila('NILO', 'RED', '7603398', '40')];
    const bd = [enBd('NILO', 'RED', '7603398', '40'), enBd('NILO', 'BLU', '7643398', '40')];

    expect(findOrphanRows(bd, excel)).toEqual([]); // NILO BLU no viene en el Excel → intacto
  });

  it('compara el producto sin distinguir mayúsculas', () => {
    const excel = [fila('backpack', 'blk', '308280', 'U')];
    const bd = [enBd('BACKPACK', 'BLK', '308280', '35')];

    expect(findOrphanRows(bd, excel)).toHaveLength(1);
  });
});
