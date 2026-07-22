import { colorWebParaSeed } from '../src/maestro/application/color-web-override';

/**
 * REQ-009 · Esta función es EL punto donde la reimportación podría "mentir" (pisar en silencio una
 * edición manual). Se prueba aparte del adaptador de Prisma para que la regla no dependa de la BD.
 *
 * Para verificarla de verdad: si se rompe `colorWebParaSeed` (p.ej. quitando el `if (manual)`), el
 * primer test se pone en ROJO.
 */
describe('colorWebParaSeed · REQ-009 (la reimportación respeta la edición manual)', () => {
  it('fila EDITADA a mano: NO se escribe el color web, aunque el Excel traiga un valor', () => {
    expect(colorWebParaSeed('AZUL DEL EXCEL', true)).toEqual({ set: false });
  });

  it('fila NO editada: se escribe el valor del Excel cuando viene', () => {
    expect(colorWebParaSeed('AZUL DEL EXCEL', false)).toEqual({ set: true, value: 'AZUL DEL EXCEL' });
  });

  it('fila NO editada y Excel vacío: no se toca (un vacío no borra lo que hay)', () => {
    expect(colorWebParaSeed(undefined, false)).toEqual({ set: false });
  });
});
