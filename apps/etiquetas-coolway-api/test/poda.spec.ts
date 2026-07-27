import { familiaDeRef, normalizeColor, RefInvalidaError } from '../src/poda/domain/familia';
import {
  comprasDelBorrador,
  comprasSinColor,
  podar,
  reescribirSociedadLinea,
  FilaSap,
  LineaBorrador,
} from '../src/poda/domain/poda';
import { podarFicheros } from '../src/poda/application/podar-ficheros.use-case';

// La tabla que mandó Silvia (correo FUNCIONES · 21/07): ref color → familia esperada.
const CHICA = [
  ['7613425', '100'], ['7663425', '766'], ['7623425', '201'],
  ['7693425', '801'], ['7633425', '860'], ['7673425', '710'], ['7603425', '"001'],
];
const CHICO = [
  ['8613832', '100'], ['8663832', '766'], ['8623832', '201'],
  ['8693832', '801'], ['8633832', '860'], ['8673832', '710'], ['8603832', '"001'],
];

describe('familiaDeRef · la regla de Silvia (3º dígito a 0, +0 al final)', () => {
  it('todas las refs chica caen en 76034250 y las chico en 86038320', () => {
    for (const [ref] of CHICA) expect(familiaDeRef(ref)).toBe('76034250');
    for (const [ref] of CHICO) expect(familiaDeRef(ref)).toBe('86038320');
  });

  it('los ejemplos del correo, uno a uno', () => {
    expect(familiaDeRef('7613425')).toBe('76034250'); // BGE
    expect(familiaDeRef('8693832')).toBe('86038320'); // DGY chico
  });

  it('DEFENSIVO: una ref con formato raro avisa, no inventa una familia', () => {
    expect(() => familiaDeRef('761342')).toThrow(RefInvalidaError); // 6 dígitos
    expect(() => familiaDeRef('76134250')).toThrow(/no tiene 7 dígitos/); // 8 dígitos
  });
});

describe('normalizeColor · el "001 de Excel y el 001 de SAP son el mismo', () => {
  it('quita la comilla y rellena a 3 dígitos', () => {
    expect(normalizeColor('"001')).toBe('001');
    expect(normalizeColor('001')).toBe('001');
    expect(normalizeColor(100)).toBe('100');
  });
});

/** Borrador del 2003: 14 comprados (Suma=13) + continuativos (Suma vacía) que NO se suben. */
const BORRADOR: LineaBorrador[] = [
  ...CHICA.map(([ourRef, colorSap]) => ({ ourRef, colorSap, suma: 13 })),
  ...CHICO.map(([ourRef, colorSap]) => ({ ourRef, colorSap, suma: 13 })),
  // continuativos (colores YEL/SLV/ORG, Suma vacía → 0): no deben contar
  { ourRef: '7623400', colorSap: '890', suma: 0 },
  { ourRef: '7683400', colorSap: '910', suma: 0 },
];

describe('comprasDelBorrador', () => {
  it('coge sólo lo comprado (Suma>0), con familia calculada y color normalizado', () => {
    const compras = comprasDelBorrador(BORRADOR);
    expect(compras).toHaveLength(14); // 7 colores × chica/chico
    expect(compras).toContainEqual({ familia: '76034250', colorSap: '100' }); // BGE chica
    expect(compras).toContainEqual({ familia: '86038320', colorSap: '001' }); // NBK chico (era "001)
    // los continuativos NO entran
    expect(compras.some((c) => c.colorSap === '890')).toBe(false);
  });
});

describe('podar · deja sólo lo comprado y avisa de lo que falta', () => {
  const compras = comprasDelBorrador(BORRADOR);

  // Fichero de SAP simulado (tipo materiales): 3 familias chica × varios colores.
  const fila = (familia: string, colorSap: string): FilaSap => ({
    familia,
    colorSap,
    cruda: `${familia}\t${colorSap}`,
    esDato: true,
  });
  const FICHERO: FilaSap[] = [
    { familia: undefined, colorSap: undefined, cruda: 'CABECERA', esDato: false },
    fila('76034250', '100'), // BGE comprada ✓
    fila('76034250', '766'), // WGR comprada ✓
    fila('76034250', '000'), // color NO comprado ✗
    fila('76034000', '100'), // familia vieja (continuativo) ✗
    fila('76035530', '100'), // otra familia ✗
  ];

  it('conserva la cabecera y sólo las filas (familia,color) compradas', () => {
    const r = podar(FICHERO, compras);
    expect(r.conservadas).toEqual(['CABECERA', '76034250\t100', '76034250\t766']);
    expect(r.conservadasDato).toBe(2); // la cabecera NO cuenta como referencia
    expect(r.retiradas).toBe(3);
  });

  it('AVISA de lo comprado que no está en el fichero (fichero incompleto, no se calla)', () => {
    // El fichero sólo trae 2 de los 14 comprados → los otros 12 se reportan.
    const r = podar(FICHERO, compras);
    expect(r.compradoQueFalta.length).toBe(12);
    expect(r.compradoQueFalta).toContainEqual({ familia: '86038320', colorSap: '100' });
  });

  it('en tarifas (sin color) basta la familia', () => {
    const tarifas: FilaSap[] = [
      { familia: '76034250', cruda: 'A', esDato: true }, // comprada ✓
      { familia: '76034000', cruda: 'B', esDato: true }, // no comprada ✗
    ];
    const r = podar(tarifas, compras);
    expect(r.conservadas).toEqual(['A']);
    expect(r.retiradas).toBe(1);
  });
});

describe('BUG-006 · borrador con la Horma (color SAP) vacía → avisar, no mentir', () => {
  // Caso real (correo «FICHERO DE MATERIALES…», 23/07): Silvia sube un borrador donde la columna Horma
  // viene VACÍA (el color sólo está como nombre). Sin el código no se puede cruzar por color.
  const BORRADOR: LineaBorrador[] = [
    { ourRef: '7613553', colorSap: '', suma: 13 }, // comprada, SIN color → familia 76035530
    { ourRef: '8613553', colorSap: '  ', suma: 13 }, // comprada, SIN color (espacios) → 86035530
    { ourRef: '7663425', colorSap: '766', suma: 13 }, // comprada, CON color (normal)
    { ourRef: '7683400', colorSap: '', suma: 0 }, // continuativo: no cuenta aunque no tenga color
  ];

  it('comprasSinColor lista las refs compradas cuyo color viene vacío (no los continuativos)', () => {
    expect(comprasSinColor(BORRADOR)).toEqual(['7613553', '8613553']);
  });

  it('una compra SIN color NO se cuela en compradoQueFalta del fichero con color (no es "fichero incompleto")', () => {
    // Es el corazón del bug: si se colara, el sistema diría "0 líneas · no aparece" (parece fichero
    // incompleto) cuando el problema es que FALTA el color en el borrador. Romper el filtro → este test cae.
    const compras = comprasDelBorrador(BORRADOR); // incluye las sin color, con colorSap=''
    const materiales: FilaSap[] = [{ familia: '76034250', colorSap: '766', cruda: 'X', esDato: true }];
    const r = podar(materiales, compras);
    expect(r.conservadas).toEqual(['X']); // la comprada CON color sí se conserva
    expect(r.compradoQueFalta).toEqual([]); // las 2 sin color NO se reportan aquí (se avisan aparte)
  });

  it('REGRESIÓN tarifas: una compra sin color SIGUE conservando su familia (las tarifas casan por familia)', () => {
    const compras = comprasDelBorrador(BORRADOR);
    const tarifas: FilaSap[] = [{ familia: '76035530', cruda: 'T', esDato: true }]; // familia de 7613553
    expect(podar(tarifas, compras).conservadas).toEqual(['T']);
  });
});

describe('REQ-010 · Fase 1 · reescribir la sociedad', () => {
  it('reescribe el código de sociedad en las columnas indicadas', () => {
    const linea = ['KI', '2000', '2000', 'X'].join('\t');
    const r = reescribirSociedadLinea(linea, [1, 2], '4000');
    expect(r.linea).toBe(['KI', '4000', '4000', 'X'].join('\t'));
    expect(r.aplicada).toBe(true);
    expect(r.sospechosa).toBe(false);
  });

  it('DEFENSIVO: NO pisa una columna que no trae un código de sociedad (evita corromper el fichero en SAP)', () => {
    // idx1 es sociedad (2000) pero idx2 es 'PR00' (clase de condición, NO sociedad): reescribe idx1, deja
    // idx2 intacto y AVISA. Romper el guard `esSociedad` → este test cae (PR00 pasaría a 4000).
    const linea = ['x', '2000', 'PR00', 'y'].join('\t');
    const r = reescribirSociedadLinea(linea, [1, 2], '4000');
    expect(r.linea).toBe(['x', '4000', 'PR00', 'y'].join('\t')); // PR00 intacto
    expect(r.sospechosa).toBe(true);
  });

  it('sin columnas (A073) devuelve la línea igual', () => {
    const linea = 'a\tb\tc';
    expect(reescribirSociedadLinea(linea, [], '4000')).toEqual({ linea, aplicada: false, sospechosa: false });
  });
});

describe('REQ-010 · Fase 1 · podarFicheros aplica la sociedad por tipo de fichero', () => {
  const borrador: LineaBorrador[] = [{ ourRef: '7613553', colorSap: '500', suma: 13 }]; // → familia 76035530

  // materiales: idx1/idx2 = sociedad, idx6 = familia, idx29 = color
  const mat = Array(30).fill('');
  mat[1] = '2000';
  mat[2] = '2000';
  mat[6] = '76035530';
  mat[29] = '500';
  // A073: matnrCol=4, no lleva sociedad
  const a073 = ['z', 'z', 'z', 'z', '76035530', 'z'];

  it('reescribe la sociedad en materiales (idx1/idx2) y NO toca A073 (no la lleva)', () => {
    const r = podarFicheros(
      borrador,
      [
        { nombre: 'ZCALvanyor.txt', contenido: mat.join('\t') },
        { nombre: 'ZSD_A073.txt', contenido: a073.join('\t') },
      ],
      '4000',
    );
    const materiales = r.ficheros.find((f) => f.tipo === 'materiales')!;
    const tarifa073 = r.ficheros.find((f) => f.tipo === 'tarifa073')!;
    const campos = materiales.podado.split('\t');
    expect(campos[1]).toBe('4000'); // reescrita
    expect(campos[2]).toBe('4000'); // reescrita
    expect(campos[6]).toBe('76035530'); // la familia NO se toca
    expect(materiales.sociedadSospechosa).toBe(0);
    expect(tarifa073.podado).toBe(a073.join('\t')); // A073 intacto
  });

  it('sin sociedad elegida, los ficheros salen igual (no se reescribe nada)', () => {
    const r = podarFicheros(borrador, [{ nombre: 'ZCALvanyor.txt', contenido: mat.join('\t') }]);
    expect(r.ficheros[0].podado.split('\t')[1]).toBe('2000'); // se queda la 2000 original
    expect(r.ficheros[0].sociedadSospechosa).toBe(0);
  });
});

describe('REQ-011 · filtrar surtidos por PREFIJO de familia (76/86)', () => {
  // Borrador compra la ref 7613553 (→ familia 76035530, prefijo 76) en color 500.
  const borrador: LineaBorrador[] = [{ ourRef: '7613553', colorSap: '500', suma: 13 }];

  // Fichero de surtidos: idx4=familia (76035530 → prefijo 76), idx6=color, idx8=SURTD.
  const surLine = (surtd: string) => {
    const f = Array(9).fill('z');
    f[4] = '76035530';
    f[6] = '500';
    f[8] = surtd;
    return f.join('\t');
  };
  const surtidos = [surLine('S40'), surLine('U12'), surLine('M40')].join('\n');

  it('con catálogo del grupo 76, deja SÓLO los surtidos de ese grupo (rompe el filtro → este test cae)', () => {
    const r = podarFicheros(borrador, [{ nombre: 'ZCAL surtidos.txt', contenido: surtidos }], undefined, [
      { grupo: '76', codigo: 'S40' },
      { grupo: '76', codigo: 'M40' },
    ]);
    const f = r.ficheros[0];
    expect(f.tipo).toBe('surtidos');
    expect(f.conservadas).toBe(2); // S40 y M40, no U12
    expect(f.retiradas).toBe(1);
  });

  it('un prefijo SIN catálogo no se filtra (opt-in por grupo)', () => {
    // catálogo sólo del grupo 86 → el fichero (familia 76…) no se filtra: se conservan todos
    const r = podarFicheros(borrador, [{ nombre: 'ZCAL surtidos.txt', contenido: surtidos }], undefined, [
      { grupo: '86', codigo: 'S40' },
    ]);
    expect(r.ficheros[0].conservadas).toBe(3);
  });

  it('sin activar surtidos, se conservan todos los comprados', () => {
    const r = podarFicheros(borrador, [{ nombre: 'ZCAL surtidos.txt', contenido: surtidos }]);
    expect(r.ficheros[0].conservadas).toBe(3);
  });
});
