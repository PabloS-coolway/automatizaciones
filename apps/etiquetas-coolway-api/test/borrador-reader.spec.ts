import { localizarColumnas, BorradorInvalidoError } from '../src/poda/infrastructure/borrador-reader';

/** Cabecera 1-indexada (col 1 = idx 1); idx 0 no se usa (ExcelJS es 1-based). */
function cab(...nombres: string[]): (string | undefined)[] {
  return [undefined, ...nombres];
}

// Coolway trae columnas de talla S46/Z → "Suma" cae en la col 14.
const COOLWAY = cab('Mod.Fabrica', 'Ref proveedor', 'Horma', 'Tacon', 'Descripcion', 'Color', 'Our Reference', 'PC', 'PVT', 'I', 'S42', 'S46', 'Z', 'Suma');
// Ulanka NO trae S46/Z → "Suma" cae en la col 12.
const ULANKA = cab('Mod.Fabrica', 'Ref proveedor', 'Horma', 'Tacon', 'Descripcion', 'Color', 'Our Reference', 'PC', 'PVT', 'I', 'S42', 'Suma');

describe('borrador-reader · localizarColumnas (BUG-009)', () => {
  it('en el layout de Coolway, "Suma" es la columna 14', () => {
    const c = localizarColumnas(COOLWAY);
    expect(c).toEqual({ ourRef: 7, horma: 3, suma: 14 });
  });

  it('en el layout de Ulanka (sin S46/Z), "Suma" es la columna 12 — no la 14', () => {
    // Regresión del bug: con la posición fija (14) se leía una columna vacía → 0 compras → 0 conservadas.
    const c = localizarColumnas(ULANKA);
    expect(c.suma).toBe(12);
    expect(c.ourRef).toBe(7);
  });

  it('tolera mayúsculas, espacios extra y acentos en la cabecera', () => {
    const c = localizarColumnas(cab('  OUR   REFERENCE ', 'súma', 'HORMA'));
    expect(c).toEqual({ ourRef: 1, suma: 2, horma: 3 });
  });

  it('AVISA (no miente) si falta una columna esencial', () => {
    expect(() => localizarColumnas(cab('Our Reference', 'Horma'))).toThrow(BorradorInvalidoError); // sin Suma
    expect(() => localizarColumnas(cab('Suma', 'Horma'))).toThrow(BorradorInvalidoError); // sin Our Reference
    expect(() => localizarColumnas(cab('Suma', 'Horma'))).toThrow(/Our Reference/);
  });

  it('«Horma» es opcional: si no está, se devuelve -1 (su ausencia la trata BUG-006)', () => {
    const c = localizarColumnas(cab('Our Reference', 'Suma'));
    expect(c.horma).toBe(-1);
    expect(c.suma).toBe(2);
  });
});
