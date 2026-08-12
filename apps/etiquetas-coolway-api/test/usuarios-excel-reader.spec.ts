import ExcelJS from 'exceljs';
import {
  generarPasswordTemporal,
  leerUsuariosDesdeBuffer,
  localizarColumnasUsuarios,
  UsuariosExcelInvalidoError,
} from '../src/auth/infrastructure/usuarios-excel-reader';

function cab(...n: string[]): (string | undefined)[] {
  return [undefined, ...n];
}

async function xlsx(filas: (string | number)[][]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Usuarios');
  filas.forEach((f) => ws.addRow(f));
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe('usuarios-excel-reader · localizarColumnas', () => {
  it('localiza email, nombre y rol por su cabecera (con alias)', () => {
    expect(localizarColumnasUsuarios(cab('Correo', 'Nombre completo', 'Perfil'))).toEqual({ email: 1, nombre: 2, rol: 3 });
    expect(localizarColumnasUsuarios(cab('Nombre', 'E-Mail'))).toEqual({ email: 2, nombre: 1, rol: -1 });
  });

  it('«rol» es opcional (-1 si no está)', () => {
    expect(localizarColumnasUsuarios(cab('email', 'nombre')).rol).toBe(-1);
  });

  it('AVISA (no importa en falso) si falta email o nombre', () => {
    expect(() => localizarColumnasUsuarios(cab('nombre', 'rol'))).toThrow(UsuariosExcelInvalidoError);
    expect(() => localizarColumnasUsuarios(cab('email', 'rol'))).toThrow(/nombre/);
  });
});

describe('usuarios-excel-reader · generarPasswordTemporal', () => {
  it('genera una contraseña legible, sin caracteres ambiguos', () => {
    for (let i = 0; i < 50; i++) {
      const p = generarPasswordTemporal();
      expect(p).toMatch(/^[A-Z][a-z]{3}-[2-9]{4}$/);
      expect(p).not.toMatch(/[0O1lI]/); // nada ambiguo
    }
  });
});

describe('usuarios-excel-reader · leerUsuariosDesdeBuffer', () => {
  it('lee las filas y salta las que no tienen email', async () => {
    const buf = await xlsx([
      ['Email', 'Nombre', 'Rol'],
      ['ANA@Y.COM', 'Ana García', 'admin'],
      ['', 'Fila sin email', 'operador'], // se salta
      ['luis@y.com', 'Luis', ''],
    ]);
    const filas = await leerUsuariosDesdeBuffer(buf);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toMatchObject({ email: 'ana@y.com', nombre: 'Ana García', rol: 'admin' }); // email normalizado a minúsculas
    expect(filas[1]).toMatchObject({ email: 'luis@y.com', nombre: 'Luis', rol: '' });
  });

  it('avisa si el Excel no trae la columna email', async () => {
    const buf = await xlsx([['Nombre', 'Rol'], ['Ana', 'admin']]);
    await expect(leerUsuariosDesdeBuffer(buf)).rejects.toBeInstanceOf(UsuariosExcelInvalidoError);
  });
});
