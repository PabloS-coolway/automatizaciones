import { LABEL_VARIANTS, variantCodes, variantFromCodes, variantLabel } from '@yorga/contracts';

describe('variantes = qué códigos lleva la etiqueta', () => {
  it('el nombre de las 4 variantes de SIEMPRE sale de la regla canónica', () => {
    // Esto es lo que protege el nombre del fichero (etiquetas_4603662_UPC_EAN.xlsx) y la celda
    // «Variante» del resumen: los consume otro proceso. Si esta regla cambiara, cambiarían los dos
    // y nadie se enteraría hasta que fallara aguas abajo.
    expect(variantFromCodes(['EAN'])).toBe('EAN');
    expect(variantFromCodes(['UPC'])).toBe('UPC');
    expect(variantFromCodes(['CODE128', 'EAN'])).toBe('CODE128_EAN');
    expect(variantFromCodes(['UPC', 'EAN'])).toBe('UPC_EAN');
  });

  it('el orden en que se marquen los checkboxes NO cambia el nombre', () => {
    // Silvia marca EAN y luego CODE128; otro día al revés. Mismo destino, mismo fichero.
    expect(variantFromCodes(['EAN', 'CODE128'])).toBe('CODE128_EAN');
    expect(variantFromCodes(['EAN', 'UPC', 'CODE128'])).toBe('CODE128_UPC_EAN');
  });

  it('sin ningún código no hay variante (una etiqueta sin código no es una etiqueta)', () => {
    expect(variantFromCodes([])).toBeNull();
  });

  it('ida y vuelta: toda variante se descompone en sus códigos y vuelve a su nombre', () => {
    for (const v of LABEL_VARIANTS) expect(variantFromCodes(variantCodes(v))).toBe(v);
  });

  it('CODE128 a solas existe (antes no se podía pedir: era el nombre, no el motor)', () => {
    expect(LABEL_VARIANTS).toContain('CODE128');
    expect(variantCodes('CODE128')).toEqual(['CODE128']);
  });

  it('en pantalla se lee "CODE128 + EAN", no "CODE128_EAN"', () => {
    expect(variantLabel('CODE128_EAN')).toBe('CODE128 + EAN');
    expect(variantLabel('CODE128_UPC_EAN')).toBe('CODE128 + UPC + EAN');
    expect(variantLabel('EAN')).toBe('EAN');
  });
});
