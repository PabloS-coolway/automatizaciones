import { useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import { PencilSquare, Trash } from 'react-bootstrap-icons';
import type { CenterDto, DepartmentDto } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';

/**
 * REQ-008 Fase 1 (Slice 2) · Gestión de centros (con marca — segmentan el organigrama) y departamentos.
 * Un centro/departamento con empleados no se puede borrar (lo impide la API y aquí se avisa).
 */
export function EstructuraManager({
  centros,
  departamentos,
  onChange,
}: {
  centros: CenterDto[];
  departamentos: DepartmentDto[];
  onChange: () => void;
}) {
  const [error, setError] = useState('');

  return (
    <div className="row g-4">
      {error && (
        <div className="col-12">
          <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>
        </div>
      )}
      <div className="col-12 col-lg-6">
        <Card>
          <Card.Body>
            <Card.Title className="h6 mb-3">Centros ({centros.length})</Card.Title>
            <AltaCentro onError={setError} onDone={onChange} />
            <ul className="list-unstyled mb-0 mt-3">
              {centros.map((c) => (
                <CentroFila key={c.id} centro={c} onError={setError} onDone={onChange} />
              ))}
              {centros.length === 0 && <li className="text-secondary small">Aún no hay centros.</li>}
            </ul>
          </Card.Body>
        </Card>
      </div>

      <div className="col-12 col-lg-6">
        <Card>
          <Card.Body>
            <Card.Title className="h6 mb-3">Departamentos ({departamentos.length})</Card.Title>
            <AltaDepartamento onError={setError} onDone={onChange} />
            <ul className="list-unstyled mb-0 mt-3">
              {departamentos.map((d) => (
                <DeptFila key={d.id} dep={d} onError={setError} onDone={onChange} />
              ))}
              {departamentos.length === 0 && <li className="text-secondary small">Aún no hay departamentos.</li>}
            </ul>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}

function AltaCentro({ onError, onDone }: { onError: (m: string) => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError('');
    try {
      await rrhhGateway.crearCentro({ name: name.trim(), brand: brand.trim() });
      setName('');
      setBrand('');
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form onSubmit={submit} className="d-flex gap-2">
      <Form.Control size="sm" placeholder="Nombre del centro" value={name} onChange={(e) => setName(e.target.value)} required />
      <Form.Control size="sm" placeholder="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} required style={{ maxWidth: 140 }} />
      <Button size="sm" type="submit" className="btn-brand flex-shrink-0" disabled={saving}>
        {saving ? <Spinner as="span" size="sm" animation="border" /> : 'Añadir'}
      </Button>
    </Form>
  );
}

function CentroFila({ centro, onError, onDone }: { centro: CenterDto; onError: (m: string) => void; onDone: () => void }) {
  const [editando, setEditando] = useState(false);
  const [name, setName] = useState(centro.name);
  const [brand, setBrand] = useState(centro.brand);
  const [busy, setBusy] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      await rrhhGateway.editarCentro(centro.id, { name: name.trim(), brand: brand.trim() });
      setEditando(false);
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function borrar() {
    if (!confirm(`¿Borrar el centro "${centro.name}"?`)) return;
    setBusy(true);
    onError('');
    try {
      await rrhhGateway.borrarCentro(centro.id);
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (editando) {
    return (
      <li className="py-1">
        <Form onSubmit={guardar} className="d-flex gap-2">
          <Form.Control size="sm" value={name} onChange={(e) => setName(e.target.value)} required />
          <Form.Control size="sm" value={brand} onChange={(e) => setBrand(e.target.value)} required style={{ maxWidth: 120 }} />
          <Button size="sm" type="submit" variant="success" disabled={busy}>Guardar</Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setEditando(false)} disabled={busy}>Cancelar</Button>
        </Form>
      </li>
    );
  }

  return (
    <li className="d-flex align-items-center gap-2 py-1 border-bottom">
      <span className="flex-grow-1">
        {centro.name} <Badge bg="secondary-subtle" text="secondary">{centro.brand}</Badge>
        {centro.employees > 0 && <span className="text-secondary small ms-2">· {centro.employees} empleado(s)</span>}
      </span>
      <Button size="sm" variant="outline-secondary" title="Editar" onClick={() => setEditando(true)} disabled={busy}><PencilSquare /></Button>
      <Button size="sm" variant="outline-danger" title="Borrar" onClick={borrar} disabled={busy || centro.employees > 0}><Trash /></Button>
    </li>
  );
}

function AltaDepartamento({ onError, onDone }: { onError: (m: string) => void; onDone: () => void }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError('');
    try {
      await rrhhGateway.crearDepartamento({ name: name.trim() });
      setName('');
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Form onSubmit={submit} className="d-flex gap-2">
      <Form.Control size="sm" placeholder="Nombre del departamento" value={name} onChange={(e) => setName(e.target.value)} required />
      <Button size="sm" type="submit" className="btn-brand flex-shrink-0" disabled={saving}>
        {saving ? <Spinner as="span" size="sm" animation="border" /> : 'Añadir'}
      </Button>
    </Form>
  );
}

function DeptFila({ dep, onError, onDone }: { dep: DepartmentDto; onError: (m: string) => void; onDone: () => void }) {
  const [editando, setEditando] = useState(false);
  const [name, setName] = useState(dep.name);
  const [busy, setBusy] = useState(false);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    onError('');
    try {
      await rrhhGateway.editarDepartamento(dep.id, { name: name.trim() });
      setEditando(false);
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function borrar() {
    if (!confirm(`¿Borrar el departamento "${dep.name}"?`)) return;
    setBusy(true);
    onError('');
    try {
      await rrhhGateway.borrarDepartamento(dep.id);
      onDone();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (editando) {
    return (
      <li className="py-1">
        <Form onSubmit={guardar} className="d-flex gap-2">
          <Form.Control size="sm" value={name} onChange={(e) => setName(e.target.value)} required />
          <Button size="sm" type="submit" variant="success" disabled={busy}>Guardar</Button>
          <Button size="sm" variant="outline-secondary" onClick={() => setEditando(false)} disabled={busy}>Cancelar</Button>
        </Form>
      </li>
    );
  }

  return (
    <li className="d-flex align-items-center gap-2 py-1 border-bottom">
      <span className="flex-grow-1">
        {dep.name}
        {dep.employees > 0 && <span className="text-secondary small ms-2">· {dep.employees} empleado(s)</span>}
      </span>
      <Button size="sm" variant="outline-secondary" title="Editar" onClick={() => setEditando(true)} disabled={busy}><PencilSquare /></Button>
      <Button size="sm" variant="outline-danger" title="Borrar" onClick={borrar} disabled={busy || dep.employees > 0}><Trash /></Button>
    </li>
  );
}
