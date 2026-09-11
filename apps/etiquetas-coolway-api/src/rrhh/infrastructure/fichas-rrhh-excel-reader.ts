import ExcelJS from 'exceljs';
import { unzipSync, zipSync } from 'fflate';

/**
 * REQ-012 · Lector del Excel AGRUPADO de fichas de RRHH (el de Ángeles, 12 columnas). Formato real:
 * la cabecera NO está en la primera fila (hay filas en blanco antes), las filas de trabajador van
 * agrupadas bajo una fila de **cabecera de grupo** (departamento o tienda), y la **zona** (col L) solo
 * aparece en la 1ª ficha de cada grupo de tienda → se arrastra al resto del grupo. Las filas "Totales"
 * cierran el grupo. Ver `docs/requerimientos/REGISTRO HORARIO PRUEBA.xlsx`.
 */

/** Excel de fichas con una cabecera que no reconocemos (faltan «Empresa» o «Nombre empleado»). */
export class FichasExcelInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FichasExcelInvalidoError';
  }
}

/** Una ficha de trabajador ya extraída del Excel (1-indexada por su fila real, para poder reportarla). */
export interface FichaFila {
  fila: number;
  /** Código de empresa (col A, numérico). Parte 1 de la clave de negocio. */
  empresaCodigo: string;
  /** Código de empleado (col B). Parte 2 de la clave de negocio. */
  empleadoCodigo: string;
  /** Nombre del empleado (col C). */
  nombre: string;
  /** Categoría profesional (col D). */
  categoria: string;
  /** Fecha de alta (col E), YYYY-MM-DD o `null`. */
  fechaAlta: string | null;
  /** DNI/NIE (col F). */
  dni: string;
  /** Código de sección (col G). */
  seccion: string;
  /** Código de contrato (col H). */
  contrato: string;
  /** Fecha de antigüedad (col I), YYYY-MM-DD o `null`. */
  fechaAntiguedad: string | null;
  /** Correo (col J), en minúsculas. */
  email: string;
  /** Nombre de la sociedad (col K), p.ej. "VANYOR SAU". */
  empresaNombre: string;
  /** Zona/área (col L) arrastrada desde la 1ª ficha del grupo; '' si el grupo no trae zona. */
  zona: string;
  /** Nombre del grupo/centro (cabecera de grupo vigente); '' si el bloque no trae cabecera. */
  grupo: string;
}

/** Columnas del Excel de fichas, localizadas por su cabecera (no por posición). */
export interface ColumnasFichas {
  empresa: number;
  empleado: number;
  nombre: number;
  categoria: number;
  fechaAlta: number;
  dni: number;
  seccion: number;
  contrato: number;
  fechaAntiguedad: number;
  email: number;
  empresaNombre: number;
  zona: number;
}

function normaliza(s: string | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function texto(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (v instanceof Date) return formatearFecha(v) ?? '';
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; hyperlink?: string };
    return String(o.text ?? o.result ?? o.hyperlink ?? '');
  }
  return String(v);
}

/** Fecha en UTC → YYYY-MM-DD (las fechas del Excel vienen a medianoche UTC). `null` si no es fecha válida. */
function formatearFecha(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dia = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

/** Lee una celda de fecha: si es Date la formatea; si es texto YYYY-MM-DD lo respeta; si no, `null`. */
function fecha(cell: ExcelJS.Cell): string | null {
  const v = cell.value;
  if (v instanceof Date) return formatearFecha(v);
  const t = texto(cell).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const parsed = t ? new Date(t) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? formatearFecha(parsed) : null;
}

/** ¿El texto es un código de empresa (dígitos puros)? Distingue una ficha de una cabecera de grupo/total. */
function esCodigoEmpresa(a: string): boolean {
  return /^\d+$/.test(a.trim());
}

/** ¿Es una fila de "Totales"/"Total Número…" que cierra el grupo? */
function esTotales(a: string): boolean {
  return /^total/.test(normaliza(a));
}

/**
 * Localiza las columnas por su cabecera (tolerante a variaciones). Todas menos zona son obligatorias para
 * reconocer el formato; si faltan «Empresa» o «Nombre empleado» se AVISA en vez de importar en falso.
 */
export function localizarColumnasFichas(cabeceras: (string | undefined)[]): ColumnasFichas {
  const buscar = (...alias: string[]): number => {
    const objetivos = alias.map(normaliza);
    for (let c = 1; c < cabeceras.length; c++) {
      if (objetivos.includes(normaliza(cabeceras[c]))) return c;
    }
    return -1;
  };
  const cols: ColumnasFichas = {
    empresa: buscar('empresa'),
    empleado: buscar('empleado - codigo', 'empleado-codigo', 'empleado codigo', 'codigo empleado', 'codigo'),
    nombre: buscar('nombre empleado', 'nombre'),
    categoria: buscar('categoria'),
    fechaAlta: buscar('fecha alta'),
    dni: buscar('dni'),
    seccion: buscar('codigo seccion', 'seccion'),
    contrato: buscar('codigo contrato', 'contrato'),
    fechaAntiguedad: buscar('fecha antiguedad'),
    email: buscar('direccion mail', 'email', 'correo', 'mail'),
    empresaNombre: -1,
    zona: buscar('area/zona', 'area zona', 'zona', 'area'),
  };
  // La col K "EMPRESA" (nombre de la sociedad) repite cabecera con la col A "Empresa" (número): se resuelve
  // como la SEGUNDA aparición de "empresa" para no confundirla con la col A.
  for (let c = cols.empresa + 1; c < cabeceras.length; c++) {
    if (normaliza(cabeceras[c]) === 'empresa') {
      cols.empresaNombre = c;
      break;
    }
  }
  const faltan = [cols.empresa < 0 ? '«Empresa»' : null, cols.nombre < 0 ? '«Nombre empleado»' : null].filter(Boolean);
  if (faltan.length > 0) {
    throw new FichasExcelInvalidoError(
      `El Excel de fichas no tiene la(s) columna(s) ${faltan.join(' y ')} en su cabecera.`,
    );
  }
  return cols;
}

/** Carga tolerante del workbook (BUG-007: algunos .xlsx válidos necesitan re-empaquetar el zip). */
async function cargarWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
    return wb;
  } catch {
    const entradas = unzipSync(new Uint8Array(buffer));
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(zipSync(entradas)) as unknown as Parameters<typeof wb.xlsx.load>[0]);
    return wb;
  }
}

/** Localiza la fila de cabecera (la que contiene «Empresa» y «Nombre empleado»); las primeras filas van en blanco. */
function localizarFilaCabecera(ws: ExcelJS.Worksheet): number {
  const maxBuscar = Math.min(ws.rowCount, 15);
  for (let r = 1; r <= maxBuscar; r++) {
    const cabeceras: (string | undefined)[] = [];
    ws.getRow(r).eachCell({ includeEmpty: true }, (cell, col) => {
      cabeceras[col] = texto(cell);
    });
    const textos = cabeceras.map(normaliza);
    if (textos.includes('empresa') && (textos.includes('nombre empleado') || textos.includes('nombre'))) return r;
  }
  throw new FichasExcelInvalidoError('No se encuentra la fila de cabecera (con «Empresa» y «Nombre empleado»).');
}

/**
 * Lee el Excel agrupado de fichas → una fila por trabajador, con su grupo (centro/depto) y su zona arrastrada.
 * Salta cabeceras de grupo, totales y filas en blanco. La zona se arrastra dentro del grupo; un grupo nuevo o
 * una fila de totales reinician grupo y zona.
 */
export async function leerFichasDesdeBuffer(buffer: Buffer): Promise<FichaFila[]> {
  const wb = await cargarWorkbook(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new FichasExcelInvalidoError('El Excel no tiene ninguna hoja.');

  const filaCabecera = localizarFilaCabecera(ws);
  const cabeceras: (string | undefined)[] = [];
  ws.getRow(filaCabecera).eachCell({ includeEmpty: true }, (cell, col) => {
    cabeceras[col] = texto(cell);
  });
  const cols = localizarColumnasFichas(cabeceras);

  const fichas: FichaFila[] = [];
  let grupoActual = '';
  let zonaActual = '';

  for (let r = filaCabecera + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const celda = (c: number) => (c > 0 ? texto(row.getCell(c)).trim() : '');
    const a = celda(cols.empresa);
    const nombre = celda(cols.nombre);

    if (esTotales(a)) {
      // Los totales cierran el bloque: el siguiente grupo empieza limpio (sin arrastrar zona ni cabecera).
      grupoActual = '';
      zonaActual = '';
      continue;
    }

    if (esCodigoEmpresa(a) && nombre) {
      const zona = celda(cols.zona);
      if (zona) zonaActual = zona; // la zona aparece en la 1ª ficha del grupo → se arrastra al resto
      fichas.push({
        fila: r,
        empresaCodigo: a,
        empleadoCodigo: celda(cols.empleado),
        nombre,
        categoria: celda(cols.categoria),
        fechaAlta: fecha(row.getCell(cols.fechaAlta)),
        dni: celda(cols.dni),
        seccion: celda(cols.seccion),
        contrato: celda(cols.contrato),
        fechaAntiguedad: cols.fechaAntiguedad > 0 ? fecha(row.getCell(cols.fechaAntiguedad)) : null,
        email: celda(cols.email).toLowerCase(),
        empresaNombre: cols.empresaNombre > 0 ? celda(cols.empresaNombre) : '',
        zona: zonaActual,
        grupo: grupoActual,
      });
      continue;
    }

    // Fila con SOLO col A y texto no numérico = cabecera de grupo (nombre de depto/tienda). Reinicia la zona.
    if (a && !esCodigoEmpresa(a)) {
      grupoActual = a;
      zonaActual = '';
      continue;
    }
    // Resto (filas en blanco o parciales): no es dato.
  }

  return fichas;
}
