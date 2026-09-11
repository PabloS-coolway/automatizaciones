import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ExcelJS from 'exceljs';
import {
  FichasExcelInvalidoError,
  leerFichasDesdeBuffer,
  localizarColumnasFichas,
} from '../src/rrhh/infrastructure/fichas-rrhh-excel-reader';

const CABECERA = [
  'Empresa',
  'Empleado -  Código',
  'Nombre empleado',
  'Categoría',
  'Fecha alta',
  'Dni',
  'Código sección',
  'Código contrato ',
  'Fecha antigüedad',
  'Direccion mail',
  'EMPRESA',
  'AREA/ZONA',
];

function cab(...n: string[]): (string | undefined)[] {
  return [undefined, ...n];
}

/** Construye un .xlsx con el formato agrupado (fila 1 en blanco, cabecera en la fila 2, como el real). */
async function xlsx(filas: (string | number | Date | null)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Hoja1');
  ws.addRow([]); // fila 1 en blanco: la cabecera NO está en la primera fila
  ws.addRow(CABECERA);
  filas.forEach((f) => ws.addRow(f.map((v) => (v === null ? '' : v))));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('fichas-rrhh-excel-reader · localizarColumnas', () => {
  it('localiza las columnas por su cabecera, incluida la col K "EMPRESA" (nombre) distinta de la col A', () => {
    const cols = localizarColumnasFichas(cab(...CABECERA));
    expect(cols.empresa).toBe(1); // col A (número de empresa)
    expect(cols.nombre).toBe(3);
    expect(cols.empresaNombre).toBe(11); // col K "EMPRESA" = 2ª aparición de "empresa"
    expect(cols.zona).toBe(12);
  });

  it('AVISA (no importa en falso) si falta «Empresa» o «Nombre empleado»', () => {
    expect(() => localizarColumnasFichas(cab('Dni', 'Categoría'))).toThrow(FichasExcelInvalidoError);
  });
});

describe('fichas-rrhh-excel-reader · leerFichasDesdeBuffer (formato agrupado)', () => {
  it('salta cabeceras de grupo y totales, arrastra la zona y detecta el número de empresa', async () => {
    const alta = new Date('2025-01-01T00:00:00.000Z');
    const buf = await xlsx([
      ['SISTEMAS', '', '', '', '', '', '', '', '', '', '', ''], // cabecera de grupo (depto): no es trabajador
      [16, 20, 'GRACIA, ROBERT', 'AUX.INFORM', alta, '53879765B', 'INFORM', 100, alta, 'ROBERT@Y.COM', 'VANYOR SAU', ''],
      [], // fila en blanco
      ['TIENDA SUC.01 ULANKA', '', '', '', '', '', '', '', '', '', '', ''], // cabecera de grupo (tienda)
      [105, 36, 'GIL, DAVID', 'ENCAR P.EX', alta, '44526115R', '01', 100, alta, 'david@y.com', 'MAYUKA SLU', 'VALENCIA'],
      [105, 282, 'ANTUNEZ, NOELIA', '2 ENCARGAD', alta, '71042711N', '01', 100, alta, 'noelia@y.com', 'MAYUKA SLU', ''], // sin zona → arrastra VALENCIA
      ['Totales', '', '', '', '', '', '', '', '', '', '', ''],
      ['Total Número de matricula 1 : 2 empleados', '', '', '', '', '', '', '', '', '', '', ''],
      [120, 2, 'CACERES, YERAY', 'JEFE ZONA', alta, '42193852F', '86', 100, alta, 'yeray@y.com', 'YORGA, S.A.U', 'LAS PALMAS-CANARIAS'],
      [120, 23, 'MARTEL, PAOLA', 'ENCARGAD.', alta, '43292907F', '86', 100, alta, 'paola@y.com', 'YORGA, S.A.U', ''], // arrastra LAS PALMAS
    ]);

    const fichas = await leerFichasDesdeBuffer(buf);

    expect(fichas).toHaveLength(5); // 3 cabeceras/totales no son trabajadores

    // Grupo SISTEMAS (departamento): sin zona.
    expect(fichas[0]).toMatchObject({ empresaCodigo: '16', empleadoCodigo: '20', nombre: 'GRACIA, ROBERT', grupo: 'SISTEMAS', zona: '', empresaNombre: 'VANYOR SAU', email: 'robert@y.com' });
    expect(fichas[0].fechaAlta).toBe('2025-01-01'); // fecha parseada
    expect(fichas[0].fechaAntiguedad).toBe('2025-01-01');

    // Grupo ULANKA: la zona VALENCIA de la 1ª ficha se arrastra a la 2ª.
    expect(fichas[1]).toMatchObject({ empresaCodigo: '105', grupo: 'TIENDA SUC.01 ULANKA', zona: 'VALENCIA' });
    expect(fichas[2]).toMatchObject({ empresaCodigo: '105', empleadoCodigo: '282', zona: 'VALENCIA' });

    // Tercer bloque SIN cabecera de grupo (grupo ''): la zona LAS PALMAS se arrastra igual.
    expect(fichas[3]).toMatchObject({ empresaCodigo: '120', grupo: '', zona: 'LAS PALMAS-CANARIAS' });
    expect(fichas[4]).toMatchObject({ empresaCodigo: '120', empleadoCodigo: '23', grupo: '', zona: 'LAS PALMAS-CANARIAS' });
  });

  it('lee el fichero REAL de Ángeles (docs/requerimientos) sin duplicar ni colar cabeceras', async () => {
    const ruta = join(__dirname, '../../../docs/requerimientos/REGISTRO HORARIO PRUEBA.xlsx');
    const fichas = await leerFichasDesdeBuffer(readFileSync(ruta));

    expect(fichas).toHaveLength(18); // 3 (Sistemas) + 6 (Ulanka) + 9 (2ª tienda)
    // Ninguna "ficha" es en realidad una cabecera o un total.
    for (const f of fichas) {
      expect(f.empresaCodigo).toMatch(/^\d+$/);
      expect(f.nombre).not.toMatch(/total/i);
    }
    // La zona se arrastra dentro del grupo de tienda.
    const ulanka = fichas.filter((f) => f.grupo === 'TIENDA SUC.01 ULANKA');
    expect(ulanka).toHaveLength(6);
    expect(ulanka.every((f) => f.zona === 'VALENCIA')).toBe(true);
    // El bloque de Las Palmas (empresa 120) no tiene cabecera de grupo pero sí zona arrastrada.
    const lasPalmas = fichas.filter((f) => f.empresaCodigo === '120');
    expect(lasPalmas).toHaveLength(9);
    expect(lasPalmas.every((f) => f.zona === 'LAS PALMAS-CANARIAS')).toBe(true);
  });
});
