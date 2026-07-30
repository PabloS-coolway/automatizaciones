import type { OrgEmployeeDto } from '@yorga/contracts';

/**
 * REQ-008 · Armado del **bosque** del organigrama para el lienzo (React Flow) — puro y testeable, porque es lo
 * que tiene que sostener cientos de empleados sin mentir: resolver el padre de cada persona, colgar de una raíz
 * sintética a quienes no tienen responsable visible, contar el tamaño de cada equipo y decidir qué se colapsa.
 */

export interface NodoBosque {
  id: string;
  /** `null` sólo en la raíz sintética que agrupa a los responsables tope. */
  emp: OrgEmployeeDto | null;
  children: NodoBosque[];
}

export const RAIZ = '__root__';

export interface Bosque {
  /** Raíz sintética; sus hijos son los responsables tope (o los huérfanos por corte de visibilidad). */
  root: NodoBosque;
  /** id → id del padre (los hijos de la raíz sintética NO aparecen aquí). */
  parent: Map<string, string>;
  /** id → nº de descendientes (tamaño del equipo). */
  equipo: Map<string, number>;
  /** Colapsados por defecto: todo el que tenga equipo salvo las raíces (vista inicial = raíces + 1 nivel). */
  colapsadosDefecto: Set<string>;
  /** Índice para el buscador. */
  index: { id: string; nombre: string }[];
}

export function construirBosque(empleados: OrgEmployeeDto[]): Bosque {
  const ids = new Set(empleados.map((e) => String(e.id)));
  const childrenOf = new Map<string, OrgEmployeeDto[]>();
  for (const e of empleados) {
    // Padre = su responsable si es visible; si no (corte de visibilidad o sin responsable), cuelga de la raíz.
    const pid = e.managerId != null && ids.has(String(e.managerId)) ? String(e.managerId) : RAIZ;
    const arr = childrenOf.get(pid) ?? [];
    arr.push(e);
    childrenOf.set(pid, arr);
  }

  const byName = (a: OrgEmployeeDto, b: OrgEmployeeDto) => a.fullName.localeCompare(b.fullName);
  const parent = new Map<string, string>();
  const visitados = new Set<string>(); // corta ciclos (no deberían existir, el backend los impide)
  const build = (e: OrgEmployeeDto): NodoBosque => {
    visitados.add(String(e.id));
    const hijos = (childrenOf.get(String(e.id)) ?? [])
      .filter((h) => !visitados.has(String(h.id)))
      .sort(byName)
      .map((h) => { parent.set(String(h.id), String(e.id)); return build(h); });
    return { id: String(e.id), emp: e, children: hijos };
  };
  const raices = (childrenOf.get(RAIZ) ?? []).sort(byName).map(build);
  const root: NodoBosque = { id: RAIZ, emp: null, children: raices };

  const equipo = new Map<string, number>();
  const cuenta = (n: NodoBosque): number => {
    const t = n.children.reduce((a, c) => a + 1 + cuenta(c), 0);
    equipo.set(n.id, t);
    return t;
  };
  cuenta(root);

  const raizIds = new Set(raices.map((r) => r.id));
  const colapsadosDefecto = new Set<string>();
  const marcar = (n: NodoBosque) => {
    if (n.id !== RAIZ && n.children.length > 0 && !raizIds.has(n.id)) colapsadosDefecto.add(n.id);
    n.children.forEach(marcar);
  };
  marcar(root);

  const index: { id: string; nombre: string }[] = [];
  const rec = (n: NodoBosque) => { if (n.emp) index.push({ id: n.id, nombre: n.emp.fullName }); n.children.forEach(rec); };
  rec(root);

  return { root, parent, equipo, colapsadosDefecto, index };
}
