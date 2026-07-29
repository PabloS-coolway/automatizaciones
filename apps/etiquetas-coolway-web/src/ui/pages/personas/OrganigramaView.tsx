import { useMemo, useState } from 'react';
import { Badge, Button } from 'react-bootstrap';
import { CaretDownFill, CaretRightFill, People } from 'react-bootstrap-icons';
import { RRHH_ROLE_LABELS, type OrgEmployeeDto } from '@yorga/contracts';
import { construirOrganigrama, type NodoOrg } from '../../../domain/organigrama';

/** Iniciales (1-2 letras) a partir del nombre, para el avatar. */
function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?';
}

/** Color estable del avatar derivado del id (para distinguir personas sin fotos). */
const AVATAR_COLORS = ['#6d28d9', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777'];
const colorDe = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

/** Nº total de subordinados (directos + indirectos) de un nodo. */
function totalEquipo(n: NodoOrg): number {
  return n.hijos.reduce((acc, h) => acc + 1 + totalEquipo(h), 0);
}

/** IDs de todos los nodos con hijos (para expandir/colapsar todo). */
function idsConHijos(nodos: NodoOrg[], acc: number[] = []): number[] {
  for (const n of nodos) {
    if (n.hijos.length > 0) acc.push(n.empleado.id);
    idsConHijos(n.hijos, acc);
  }
  return acc;
}

/**
 * REQ-008 · Organigrama visual, segmentado por marca. Público (toda la plantilla). Árbol **interactivo**:
 * cada persona con avatar; los responsables se pueden **colapsar/expandir**. Se construye en el dominio.
 */
export function OrganigramaView({ empleados }: { empleados: OrgEmployeeDto[] }) {
  const ramas = useMemo(() => construirOrganigrama(empleados), [empleados]);
  const todosConHijos = useMemo(() => idsConHijos(ramas.flatMap((r) => r.raices)), [ramas]);
  // Colapsados = conjunto de ids ocultos. Por defecto todo expandido.
  const [colapsados, setColapsados] = useState<Set<number>>(new Set());

  if (ramas.length === 0) return <p className="text-secondary mb-0">No hay empleados que mostrar.</p>;

  const toggle = (id: number) =>
    setColapsados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div>
      <div className="d-flex justify-content-end gap-2 mb-3">
        <Button size="sm" variant="outline-secondary" onClick={() => setColapsados(new Set())}>Expandir todo</Button>
        <Button size="sm" variant="outline-secondary" onClick={() => setColapsados(new Set(todosConHijos))}>Colapsar todo</Button>
      </div>
      <div className="d-flex flex-column gap-4">
        {ramas.map((rama) => (
          <div key={rama.marca}>
            <h2 className="h6 text-uppercase text-secondary mb-3">{rama.marca}</h2>
            <ul className="org-tree list-unstyled mb-0">
              {rama.raices.map((n) => (
                <NodoFila key={n.empleado.id} nodo={n} colapsados={colapsados} onToggle={toggle} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodoFila({ nodo, colapsados, onToggle }: { nodo: NodoOrg; colapsados: Set<number>; onToggle: (id: number) => void }) {
  const e = nodo.empleado;
  const tieneHijos = nodo.hijos.length > 0;
  const colapsado = colapsados.has(e.id);
  const equipo = tieneHijos ? totalEquipo(nodo) : 0;

  return (
    <li className="org-node">
      <div className="org-card">
        {tieneHijos ? (
          <button type="button" className="org-toggle" onClick={() => onToggle(e.id)} aria-label={colapsado ? 'Expandir' : 'Colapsar'}>
            {colapsado ? <CaretRightFill /> : <CaretDownFill />}
          </button>
        ) : (
          <span className="org-toggle org-toggle-empty" aria-hidden />
        )}
        <span className="org-avatar" style={{ background: e.active ? colorDe(e.id) : 'var(--border)' }}>{iniciales(e.fullName)}</span>
        <div className="org-info">
          <div className="org-nombre">
            <strong>{e.fullName}</strong>
            {!e.active && <Badge bg="secondary-subtle" text="secondary" className="ms-2">baja</Badge>}
          </div>
          <div className="org-meta text-secondary small">
            {e.position && <span>{e.position}</span>}
            <Badge bg="secondary-subtle" text="secondary" className="fw-normal">{RRHH_ROLE_LABELS[e.rrhhRole]}</Badge>
            {e.center && <span>· {e.center}</span>}
            {tieneHijos && (
              <span className="org-equipo" title="Personas a su cargo (directas e indirectas)"><People className="me-1" />{equipo}</span>
            )}
          </div>
        </div>
      </div>
      {tieneHijos && !colapsado && (
        <ul className="list-unstyled mb-0">
          {nodo.hijos.map((h) => (
            <NodoFila key={h.empleado.id} nodo={h} colapsados={colapsados} onToggle={onToggle} />
          ))}
        </ul>
      )}
    </li>
  );
}
