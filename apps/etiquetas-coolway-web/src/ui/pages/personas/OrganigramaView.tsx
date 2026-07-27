import { Badge } from 'react-bootstrap';
import { RRHH_ROLE_LABELS, type EmployeeDto } from '@yorga/contracts';
import { construirOrganigrama, type NodoOrg } from '../../../domain/organigrama';

/** REQ-008 Fase 1 (Slice 2) · Organigrama visual, segmentado por marca. Se construye del lado del dominio. */
export function OrganigramaView({ empleados }: { empleados: EmployeeDto[] }) {
  const ramas = construirOrganigrama(empleados);
  if (ramas.length === 0) return <p className="text-secondary mb-0">No hay empleados que mostrar.</p>;

  return (
    <div className="d-flex flex-column gap-4">
      {ramas.map((rama) => (
        <div key={rama.marca}>
          <h2 className="h6 text-uppercase text-secondary mb-3">{rama.marca}</h2>
          <ul className="org-tree list-unstyled mb-0">
            {rama.raices.map((n) => (
              <NodoFila key={n.empleado.id} nodo={n} nivel={0} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function NodoFila({ nodo, nivel }: { nodo: NodoOrg; nivel: number }) {
  const e = nodo.empleado;
  return (
    <li className="org-node">
      <div
        className="d-flex align-items-center gap-2 py-1"
        style={{ paddingLeft: `${nivel * 1.5}rem` }}
      >
        <span className={`org-dot ${e.active ? '' : 'org-dot-off'}`} aria-hidden />
        <strong>{e.fullName}</strong>
        {e.position && <span className="text-secondary small">· {e.position}</span>}
        <Badge bg="secondary-subtle" text="secondary">{RRHH_ROLE_LABELS[e.rrhhRole]}</Badge>
        {e.center && <span className="text-secondary small">· {e.center}</span>}
        {!e.active && <Badge bg="secondary-subtle" text="secondary">baja</Badge>}
      </div>
      {nodo.hijos.length > 0 && (
        <ul className="list-unstyled mb-0">
          {nodo.hijos.map((h) => (
            <NodoFila key={h.empleado.id} nodo={h} nivel={nivel + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
