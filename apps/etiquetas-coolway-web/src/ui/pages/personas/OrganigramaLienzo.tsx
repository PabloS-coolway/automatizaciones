import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hierarchy, tree } from 'd3-hierarchy';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CaretDownFill, CaretRightFill, People, Search } from 'react-bootstrap-icons';
import { RRHH_ROLE_LABELS, type OrgEmployeeDto } from '@yorga/contracts';
import { construirBosque, RAIZ, type NodoBosque } from '../../../domain/organigrama-bosque';

const NODO_W = 230;
const NODO_H = 96;
const AVATAR_COLORS = ['#6d28d9', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777'];
const colorDe = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];
const iniciales = (nombre: string) => {
  const p = nombre.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p[1]?.[0] ?? '')).toUpperCase() || '?';
};

interface OrgNodeData extends Record<string, unknown> {
  emp: OrgEmployeeDto;
  hasChildren: boolean;
  colapsado: boolean;
  equipo: number;
  onToggle: (id: string) => void;
}

/** Tarjeta de una persona en el lienzo. Con toggle de colapsado si tiene equipo. */
function OrgNode({ data }: NodeProps<Node<OrgNodeData>>) {
  const e = data.emp;
  return (
    <div className={`org-rf-card ${e.active ? '' : 'org-rf-off'}`}>
      <Handle type="target" position={Position.Top} className="org-rf-handle" />
      <span className="org-rf-avatar" style={{ background: e.active ? colorDe(e.id) : 'var(--border)' }}>{iniciales(e.fullName)}</span>
      <div className="org-rf-info">
        <div className="org-rf-nombre">{e.fullName}</div>
        <div className="org-rf-meta">{e.position ?? RRHH_ROLE_LABELS[e.rrhhRole]}{e.center ? ` · ${e.center}` : ''}</div>
      </div>
      {data.hasChildren && (
        <button
          type="button"
          className="org-rf-toggle"
          onClick={(ev) => { ev.stopPropagation(); data.onToggle(String(e.id)); }}
          title={data.colapsado ? `Expandir (${data.equipo})` : 'Colapsar'}
        >
          {data.colapsado ? <CaretRightFill /> : <CaretDownFill />}
          <span className="org-rf-equipo"><People />{data.equipo}</span>
        </button>
      )}
      <Handle type="source" position={Position.Bottom} className="org-rf-handle" />
    </div>
  );
}

const nodeTypes = { org: OrgNode };

function LienzoInterno({ empleados }: { empleados: OrgEmployeeDto[] }) {
  const { setCenter } = useReactFlow();

  // Bosque (dominio puro, testeado) → árbol + índices para el layout, el buscador y el colapsado por defecto.
  const { fullTree, parentMap, equipoDe, defaultColapsados, nombreIndex } = useMemo(() => {
    const b = construirBosque(empleados);
    return { fullTree: b.root, parentMap: b.parent, equipoDe: b.equipo, defaultColapsados: b.colapsadosDefecto, nombreIndex: b.index };
  }, [empleados]);

  const [colapsados, setColapsados] = useState<Set<string>>(defaultColapsados);
  useEffect(() => setColapsados(defaultColapsados), [defaultColapsados]);

  const [busca, setBusca] = useState('');
  const focoRef = useRef<string | null>(null);

  const toggle = useCallback((id: string) => {
    setColapsados((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  // Layout del árbol podado según colapsados → posiciones (d3-tree) → nodos/aristas de React Flow.
  const { nodes, edges, posPorId } = useMemo(() => {
    const jerarquia = hierarchy<NodoBosque>(fullTree, (d) => (colapsados.has(d.id) ? [] : d.children));
    const root = tree<NodoBosque>().nodeSize([NODO_W + 40, NODO_H + 80])(jerarquia);
    const ns: Node<OrgNodeData>[] = [];
    const es: Edge[] = [];
    const pos = new Map<string, { x: number; y: number }>();
    root.each((n) => {
      if (n.data.id === RAIZ || !n.data.emp) return;
      pos.set(n.data.id, { x: n.x, y: n.y });
      ns.push({
        id: n.data.id,
        type: 'org',
        position: { x: n.x, y: n.y },
        data: { emp: n.data.emp, hasChildren: n.data.children.length > 0, colapsado: colapsados.has(n.data.id), equipo: equipoDe.get(n.data.id) ?? 0, onToggle: toggle },
      });
      if (n.parent && n.parent.data.id !== RAIZ) {
        es.push({ id: `${n.parent.data.id}-${n.data.id}`, source: n.parent.data.id, target: n.data.id, type: 'smoothstep' });
      }
    });
    return { nodes: ns, edges: es, posPorId: pos };
  }, [fullTree, colapsados, equipoDe, toggle]);

  // Al buscar: expandir el camino hasta la persona y centrar la cámara en ella.
  function buscar(nombre: string) {
    setBusca(nombre);
    const q = nombre.trim().toLowerCase();
    if (!q) return;
    const hit = nombreIndex.find((x) => x.nombre.toLowerCase().includes(q));
    if (!hit) return;
    setColapsados((prev) => {
      const n = new Set(prev);
      let cur = parentMap.get(hit.id);
      while (cur) { n.delete(cur); cur = parentMap.get(cur); }
      return n;
    });
    focoRef.current = hit.id;
  }

  useEffect(() => {
    const id = focoRef.current;
    if (!id) return;
    const p = posPorId.get(id);
    if (p) { setCenter(p.x, p.y, { zoom: 1.1, duration: 600 }); focoRef.current = null; }
  }, [posPorId, setCenter]);

  return (
    <div className="org-rf-wrap">
      <div className="org-rf-toolbar">
        <div className="buscador-plantilla">
          <Search className="buscador-icono" />
          <input className="form-control form-control-sm" placeholder="Buscar persona…" value={busca} onChange={(e) => buscar(e.target.value)} aria-label="Buscar en el organigrama" />
          {busca && <button type="button" className="buscador-limpiar" onClick={() => setBusca('')} aria-label="Limpiar">×</button>}
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setColapsados(new Set())}>Expandir todo</button>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setColapsados(defaultColapsados)}>Reducir</button>
        </div>
      </div>
      <div className="org-rf-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          colorMode="system"
          fitView
          minZoom={0.15}
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable nodeColor={(n) => ((n.data as OrgNodeData)?.emp?.active ? colorDe((n.data as OrgNodeData).emp.id) : '#bbb')} />
        </ReactFlow>
      </div>
    </div>
  );
}

/**
 * REQ-008 · Organigrama en LIENZO (zoom/pan/minimap). Pensado para cientos de empleados: se pinta como un árbol
 * navegable, colapsado por defecto (raíces + su primer nivel) y con buscador que enfoca a una persona
 * expandiendo su rama. Nada de listas kilométricas.
 */
export function OrganigramaLienzo({ empleados }: { empleados: OrgEmployeeDto[] }) {
  if (empleados.length === 0) return <p className="text-secondary mb-0">No hay empleados que mostrar.</p>;
  return (
    <ReactFlowProvider>
      <LienzoInterno empleados={empleados} />
    </ReactFlowProvider>
  );
}
