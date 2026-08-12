import { randomInt } from 'node:crypto';
import ExcelJS from 'exceljs';
import { unzipSync, zipSync } from 'fflate';

/** Excel de usuarios con una cabecera inesperada (falta «email» o «nombre»). El controller lo traduce a 400. */
export class UsuariosExcelInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsuariosExcelInvalidoError';
  }
}

/** Una fila del Excel de usuarios (1-indexada por su fila real, para poder reportar dónde falló). */
export interface FilaUsuario {
  fila: number;
  email: string;
  nombre: string;
  /** Rol pedido en el Excel; vacío = usar el rol por defecto. */
  rol: string;
}

export interface ColumnasUsuarios {
  email: number;
  nombre: number;
  /** -1 si el Excel no trae columna de rol (se usará el rol por defecto). */
  rol: number;
}

function normalizaCabecera(s: string | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * MEJ · Localiza las columnas del Excel de usuarios **por su cabecera** (no por posición), tolerante a
 * variaciones de nombre. `email` y `nombre` son obligatorias; si faltan, se AVISA en vez de importar en falso.
 * `rol` es opcional (sin ella, todos entran con el rol por defecto).
 */
export function localizarColumnasUsuarios(cabeceras: (string | undefined)[]): ColumnasUsuarios {
  const buscar = (alias: string[]): number => {
    const objetivos = alias.map(normalizaCabecera);
    for (let c = 1; c < cabeceras.length; c++) {
      if (objetivos.includes(normalizaCabecera(cabeceras[c]))) return c;
    }
    return -1;
  };
  const email = buscar(['email', 'correo', 'correo electronico', 'e-mail', 'mail']);
  const nombre = buscar(['nombre', 'name', 'nombre completo', 'nombre y apellidos']);
  const rol = buscar(['rol', 'role', 'perfil']);
  const faltan = [email < 0 ? '«email»' : null, nombre < 0 ? '«nombre»' : null].filter(Boolean);
  if (faltan.length > 0) {
    throw new UsuariosExcelInvalidoError(
      `El Excel no tiene la(s) columna(s) ${faltan.join(' y ')} en su cabecera. Necesito al menos "email" y "nombre".`,
    );
  }
  return { email, nombre, rol };
}

// Contraseña temporal: legible y sin caracteres ambiguos (nada de 0/O/1/l/I). Ej.: "Xkmn-4821".
const MAY = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const MIN = 'abcdefghijkmnpqrstuvwxyz';
const DIG = '23456789';
const elige = (s: string) => s[randomInt(s.length)];

export function generarPasswordTemporal(): string {
  return elige(MAY) + elige(MIN) + elige(MIN) + elige(MIN) + '-' + elige(DIG) + elige(DIG) + elige(DIG) + elige(DIG);
}

function texto(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown; hyperlink?: string };
    return String(o.text ?? o.result ?? o.hyperlink ?? '');
  }
  return String(v);
}

/** Carga tolerante del workbook desde un buffer (BUG-007: algunos Excel válidos necesitan re-empaquetar el zip). */
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

/** Lee el Excel de usuarios (primera hoja) → filas (email, nombre, rol). Salta la cabecera y las filas sin email. */
export async function leerUsuariosDesdeBuffer(buffer: Buffer): Promise<FilaUsuario[]> {
  const wb = await cargarWorkbook(buffer);
  const ws = wb.worksheets[0];
  if (!ws) throw new UsuariosExcelInvalidoError('El Excel no tiene ninguna hoja.');

  const cabeceras: (string | undefined)[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    cabeceras[col] = texto(cell);
  });
  const cols = localizarColumnasUsuarios(cabeceras);

  const filas: FilaUsuario[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const email = texto(ws.getRow(r).getCell(cols.email)).trim().toLowerCase();
    if (!email) continue; // fila sin email = separador/cabecera → no es dato
    filas.push({
      fila: r,
      email,
      nombre: texto(ws.getRow(r).getCell(cols.nombre)).trim(),
      rol: cols.rol > 0 ? texto(ws.getRow(r).getCell(cols.rol)).trim() : '',
    });
  }
  return filas;
}
