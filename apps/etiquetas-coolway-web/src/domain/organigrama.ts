import type { EmployeeDto } from '@yorga/contracts';

/** Un nodo del organigrama: un empleado y su equipo (directo e indirecto). */
export interface NodoOrg {
  empleado: EmployeeDto;
  hijos: NodoOrg[];
}

/** Una rama de marca: el organigrama va **segmentado por enseña** (multimarca). */
export interface RamaMarca {
  marca: string;
  raices: NodoOrg[];
}

const SIN_MARCA = 'Sin marca asignada';

/**
 * REQ-008 Fase 1 (Slice 2) · Construye el organigrama a partir de la plantilla **visible**.
 *
 * - **Raíz** = quien no tiene responsable, o cuyo responsable no está en la lista (la visibilidad jerárquica
 *   puede recortar hacia arriba: un manager ve su rama, no a su jefe). Así su rama no queda huérfana.
 * - **Segmentado por marca** del centro (la enseña); los que no tienen centro caen en "Sin marca asignada".
 * - Ordenado por nombre en cada nivel. Protegido contra ciclos (no debería haberlos: el backend los impide).
 */
export function construirOrganigrama(empleados: EmployeeDto[]): RamaMarca[] {
  const porNombre = (a: NodoOrg, b: NodoOrg) => a.empleado.fullName.localeCompare(b.empleado.fullName);
  const ids = new Set(empleados.map((e) => e.id));
  const hijosDe = new Map<number, EmployeeDto[]>();
  for (const e of empleados) {
    if (e.managerId != null && ids.has(e.managerId)) {
      const arr = hijosDe.get(e.managerId) ?? [];
      arr.push(e);
      hijosDe.set(e.managerId, arr);
    }
  }

  const construir = (e: EmployeeDto, visitados: Set<number>): NodoOrg => {
    visitados.add(e.id);
    const hijos = (hijosDe.get(e.id) ?? [])
      .filter((h) => !visitados.has(h.id))
      .map((h) => construir(h, visitados))
      .sort(porNombre);
    return { empleado: e, hijos };
  };

  const raices = empleados.filter((e) => e.managerId == null || !ids.has(e.managerId));

  const porMarca = new Map<string, NodoOrg[]>();
  for (const r of raices) {
    const marca = r.brand ?? SIN_MARCA;
    const arr = porMarca.get(marca) ?? [];
    arr.push(construir(r, new Set()));
    porMarca.set(marca, arr);
  }

  return [...porMarca.entries()]
    .map(([marca, raices]) => ({ marca, raices: raices.sort(porNombre) }))
    .sort((a, b) => {
      // "Sin marca asignada" siempre al final; el resto alfabético.
      if (a.marca === SIN_MARCA) return 1;
      if (b.marca === SIN_MARCA) return -1;
      return a.marca.localeCompare(b.marca);
    });
}
