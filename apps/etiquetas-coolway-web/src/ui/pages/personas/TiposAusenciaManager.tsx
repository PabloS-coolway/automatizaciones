import { useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import { CheckLg, PencilSquare, Trash, XLg } from 'react-bootstrap-icons';
import type { AbsenceTypeDto } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';

/** Los tres flags editables de un tipo. */
interface Flags {
  name: string;
  computesBalance: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
}

/**
 * REQ-008 Fase 3 · Catálogo de tipos de ausencia (solo RRHH). Cada tipo define si computa saldo, si requiere
 * aprobación y si exige justificante. Se pueden **editar** (nombre y flags) y activar/desactivar; un tipo con
 * solicitudes no se borra, se desactiva. Por defecto un tipo nuevo **descuenta saldo** (el caso habitual:
 * vacaciones); desmárcalo para bajas/permisos que no consumen cupo.
 */
export function TiposAusenciaManager({ tipos, onChange }: { tipos: AbsenceTypeDto[]; onChange: () => void }) {
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState<Flags>({ name: '', computesBalance: true, requiresApproval: true, requiresAttachment: false });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [edit, setEdit] = useState<Flags>({ name: '', computesBalance: true, requiresApproval: true, requiresAttachment: false });
  const [savingEdit, setSavingEdit] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await rrhhGateway.crearTipoAusencia({ ...nuevo, name: nuevo.name.trim() });
      setNuevo({ name: '', computesBalance: true, requiresApproval: true, requiresAttachment: false });
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function abrirEdicion(t: AbsenceTypeDto) {
    setEditId(t.id);
    setEdit({ name: t.name, computesBalance: t.computesBalance, requiresApproval: t.requiresApproval, requiresAttachment: t.requiresAttachment });
    setError('');
  }

  async function guardarEdicion(t: AbsenceTypeDto) {
    setSavingEdit(true);
    setError('');
    try {
      await rrhhGateway.editarTipoAusencia(t.id, { ...edit, name: edit.name.trim() });
      setEditId(null);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function alternarActivo(t: AbsenceTypeDto) {
    setError('');
    try {
      await rrhhGateway.editarTipoAusencia(t.id, { active: !t.active });
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function borrar(t: AbsenceTypeDto) {
    if (!confirm(`¿Borrar el tipo "${t.name}"?`)) return;
    setError('');
    try {
      await rrhhGateway.borrarTipoAusencia(t.id);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Card>
      <Card.Body>
        <Card.Title className="h6 mb-3">Tipos de ausencia ({tipos.length})</Card.Title>
        {error && <Alert variant="danger" className="py-2" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

        <Form onSubmit={crear} className="row g-2 align-items-end mb-3">
          <div className="col-12 col-md-3">
            <Form.Label className="small mb-1">Nombre</Form.Label>
            <Form.Control size="sm" value={nuevo.name} required placeholder="Vacaciones" onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })} />
          </div>
          <div className="col-auto">
            <Form.Check type="checkbox" label="Descuenta saldo" checked={nuevo.computesBalance} onChange={(e) => setNuevo({ ...nuevo, computesBalance: e.target.checked })} />
          </div>
          <div className="col-auto">
            <Form.Check type="checkbox" label="Requiere aprobación" checked={nuevo.requiresApproval} onChange={(e) => setNuevo({ ...nuevo, requiresApproval: e.target.checked })} />
          </div>
          <div className="col-auto">
            <Form.Check type="checkbox" label="Justificante" checked={nuevo.requiresAttachment} onChange={(e) => setNuevo({ ...nuevo, requiresAttachment: e.target.checked })} />
          </div>
          <div className="col-auto">
            <Button size="sm" type="submit" className="btn-brand" disabled={saving}>
              {saving ? <Spinner as="span" size="sm" animation="border" /> : 'Añadir'}
            </Button>
          </div>
        </Form>

        <ul className="list-unstyled mb-0">
          {tipos.map((t) => (
            <li key={t.id} className="py-1 border-bottom">
              {editId === t.id ? (
                <div className="row g-2 align-items-center">
                  <div className="col-12 col-md-3">
                    <Form.Control size="sm" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  </div>
                  <div className="col-auto"><Form.Check type="checkbox" label="Descuenta saldo" checked={edit.computesBalance} onChange={(e) => setEdit({ ...edit, computesBalance: e.target.checked })} /></div>
                  <div className="col-auto"><Form.Check type="checkbox" label="Requiere aprobación" checked={edit.requiresApproval} onChange={(e) => setEdit({ ...edit, requiresApproval: e.target.checked })} /></div>
                  <div className="col-auto"><Form.Check type="checkbox" label="Justificante" checked={edit.requiresAttachment} onChange={(e) => setEdit({ ...edit, requiresAttachment: e.target.checked })} /></div>
                  <div className="col-auto d-flex gap-1">
                    <Button size="sm" className="btn-brand" title="Guardar" onClick={() => guardarEdicion(t)} disabled={savingEdit || !edit.name.trim()}>
                      {savingEdit ? <Spinner as="span" size="sm" animation="border" /> : <CheckLg />}
                    </Button>
                    <Button size="sm" variant="outline-secondary" title="Cancelar" onClick={() => setEditId(null)}><XLg /></Button>
                  </div>
                </div>
              ) : (
                <div className="d-flex align-items-center gap-2">
                  <span className="flex-grow-1">
                    {t.name}
                    {!t.active && <Badge bg="secondary-subtle" text="secondary" className="ms-2">inactivo</Badge>}
                    {t.computesBalance && <Badge bg="info-subtle" text="info" className="ms-2">saldo</Badge>}
                    {t.requiresApproval && <Badge bg="warning-subtle" text="warning" className="ms-2">aprobación</Badge>}
                    {t.requiresAttachment && <Badge bg="secondary-subtle" text="secondary" className="ms-2">justificante</Badge>}
                    {t.usos > 0 && <span className="text-secondary small ms-2">· {t.usos} uso/s</span>}
                  </span>
                  <Button size="sm" variant="outline-secondary" title="Editar" onClick={() => abrirEdicion(t)}><PencilSquare /></Button>
                  <Button size="sm" variant="outline-secondary" onClick={() => alternarActivo(t)}>{t.active ? 'Desactivar' : 'Activar'}</Button>
                  <Button size="sm" variant="outline-danger" title="Borrar" onClick={() => borrar(t)} disabled={t.usos > 0}><Trash /></Button>
                </div>
              )}
            </li>
          ))}
          {tipos.length === 0 && <li className="text-secondary small">Aún no hay tipos. Crea el primero (p.ej. Vacaciones).</li>}
        </ul>
      </Card.Body>
    </Card>
  );
}
