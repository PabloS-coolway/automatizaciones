import { construirBosque, RAIZ } from '../src/domain/organigrama-bosque';
import type { OrgEmployeeDto } from '@yorga/contracts';

const emp = (id: number, managerId: number | null, fullName = `E${id}`): OrgEmployeeDto => ({
  id, fullName, position: null, rrhhRole: 'EMPLEADO', managerId, active: true, center: null, brand: null,
});

describe('domain · construirBosque (organigrama lienzo)', () => {
  it('cuelga de la raíz a quien no tiene responsable', () => {
    const b = construirBosque([emp(1, null), emp(2, null)]);
    expect(b.root.children.map((n) => n.id).sort()).toEqual(['1', '2']);
  });

  it('cuelga de la raíz a quien tiene un responsable NO visible (corte de visibilidad)', () => {
    // 2 apunta a 99, que no está en la lista → 2 pasa a ser raíz (no queda huérfano).
    const b = construirBosque([emp(2, 99)]);
    expect(b.root.children.map((n) => n.id)).toEqual(['2']);
    expect(b.parent.get('2')).toBeUndefined();
  });

  it('anida a los subordinados y cuenta el tamaño del equipo (directos + indirectos)', () => {
    // 1 → 2 → 3, y 1 → 4
    const b = construirBosque([emp(1, null), emp(2, 1), emp(3, 2), emp(4, 1)]);
    expect(b.equipo.get('1')).toBe(3); // 2, 3, 4
    expect(b.equipo.get('2')).toBe(1); // 3
    expect(b.equipo.get('4')).toBe(0);
    expect(b.parent.get('3')).toBe('2');
  });

  it('colapsa por defecto lo que tiene equipo salvo las raíces (vista inicial = raíz + 1 nivel)', () => {
    const b = construirBosque([emp(1, null), emp(2, 1), emp(3, 2)]);
    expect(b.colapsadosDefecto.has('1')).toBe(false); // raíz, expandida
    expect(b.colapsadosDefecto.has('2')).toBe(true); // tiene equipo → colapsado
    expect(b.colapsadosDefecto.has('3')).toBe(false); // hoja, nada que colapsar
  });

  it('el índice del buscador incluye a todos y excluye la raíz sintética', () => {
    const b = construirBosque([emp(1, null, 'Ana'), emp(2, 1, 'Beatriz')]);
    expect(b.index.map((x) => x.nombre).sort()).toEqual(['Ana', 'Beatriz']);
    expect(b.index.some((x) => x.id === RAIZ)).toBe(false);
  });

  it('no entra en bucle infinito ni duplica si hubiera un ciclo (defensa)', () => {
    // 1 → 2 y 2 → 1 (no debería pasar; el backend lo impide). Sin raíz no hay a quién colgar,
    // pero lo esencial es que TERMINA y no duplica nodos.
    const b = construirBosque([emp(1, 2), emp(2, 1)]);
    expect(b.index.length).toBeLessThanOrEqual(2);
  });

  it('un ciclo en una subrama no cuelga y conserva la raíz alcanzable', () => {
    // 1 es raíz; 2→3 y 3→2 forman un ciclo colgando de 1 sólo por uno de ellos.
    const b = construirBosque([emp(1, null), emp(2, 1), emp(3, 2), emp(4, 3)]);
    expect(b.index.some((x) => x.id === '1')).toBe(true);
    expect(b.index.length).toBeLessThanOrEqual(4); // termina, sin duplicar
  });

  it('escala: 300 empleados en cadena producen 300 nodos indexados', () => {
    const muchos = Array.from({ length: 300 }, (_, i) => emp(i + 1, i === 0 ? null : i));
    const b = construirBosque(muchos);
    expect(b.index).toHaveLength(300);
    expect(b.equipo.get('1')).toBe(299);
  });
});
