import { leerFicheroSap, serializarFicheroSap, tipoPorNombre } from '../src/poda/infrastructure/sap-file-reader';

describe('tipoPorNombre', () => {
  it('reconoce los cuatro ficheros por su nombre', () => {
    expect(tipoPorNombre('2003 ZCALvanyor[2026-07-16] 138 reg.txt')).toBe('materiales');
    expect(tipoPorNombre('ZCAL surtidos-112901-1707-216 Reg.txt')).toBe('surtidos');
    expect(tipoPorNombre('ZSD_A906-112539-1707-30 Reg.txt')).toBe('tarifa906');
    expect(tipoPorNombre('ZSD_A073-112540-1707-10Reg.txt')).toBe('tarifa073');
    expect(tipoPorNombre('otra_cosa.txt')).toBeNull();
  });
});

describe('leerFicheroSap · materiales (MATNR col 6, color col 29)', () => {
  // Cabecera + una fila de dato con 30 columnas (col 6 = familia, col 29 = color).
  const cab = Array(30).fill('').map((_, i) => `H${i}`).join('\t');
  const fila = (fam: string, color: string) => {
    const c = Array(30).fill('');
    c[6] = fam;
    c[29] = color;
    return c.join('\t');
  };
  const contenido = [cab, fila('76034250', '100'), fila('76034000', '766')].join('\n');

  it('marca la cabecera como no-dato y extrae familia + color de las filas', () => {
    const { filas } = leerFicheroSap(contenido, 'materiales');
    expect(filas[0].esDato).toBe(false); // cabecera
    expect(filas[1]).toMatchObject({ esDato: true, familia: '76034250', colorSap: '100' });
    expect(filas[2]).toMatchObject({ esDato: true, familia: '76034000', colorSap: '766' });
  });

  it('una línea es dato sólo si su MATNR es una familia de 8 dígitos', () => {
    const { filas } = leerFicheroSap(contenido, 'materiales');
    expect(filas.filter((f) => f.esDato)).toHaveLength(2);
  });
});

describe('leerFicheroSap · tarifas (sin color) y cabeceras de SAP', () => {
  // Las tarifas traen líneas de cabecera "-->" y "***" que no son dato y se conservan.
  const contenido = [
    '[ID variantes]\t[Texto]\tKSCHL\tKOTABN\tMATNR', // cabecera
    '-->\tValores\t\t&KOTABN&',
    '\t\tVKP0\t\t76034000\tPAA\t90,00', // dato: MATNR col 4
    '\t\tVKP0\t\t76034250\tPAA\t90,00',
  ].join('\n');

  it('sólo las líneas con MATNR de 8 dígitos son dato', () => {
    const { filas } = leerFicheroSap(contenido, 'tarifa073');
    expect(filas.map((f) => f.esDato)).toEqual([false, false, true, true]);
    expect(filas[2]).toMatchObject({ familia: '76034000', colorSap: undefined });
  });
});

describe('serializarFicheroSap · el fichero de salida no cambia de formato', () => {
  it('conserva el salto de línea original (round-trip)', () => {
    const original = 'a\r\nb\r\nc\r\n';
    const { filas, eol, finalConSalto } = leerFicheroSap(original, 'tarifa073');
    // sin podar nada, reescribir debe devolver lo mismo
    expect(serializarFicheroSap(filas.map((f) => f.cruda), eol, finalConSalto)).toBe(original);
  });
});
