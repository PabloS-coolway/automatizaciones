import { useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import { Trash } from 'react-bootstrap-icons';
import type { AbsenceTypeDto } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';

/**
 * REQ-008 Fase 3 · Catálogo de tipos de ausencia (solo RRHH). Cada tipo define si computa saldo, si requiere
 * aprobación y si exige justificante. Un tipo con solicitudes no se borra: se desactiva.
 */
export function TiposAusenciaManager({ tipos, onChange }: { tipos: AbsenceTypeDto[]; onChange: () => void }) {
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [computesBalance, setComputesBalance] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [saving, setSaving] = useState(false);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await rrhhGateway.crearTipoAusencia({ name: name.trim(), computesBalance, requiresApproval, requiresAttachment });
      setName('');
      setComputesBalance(false);
      setRequiresApproval(true);
      setRequiresAttachment(false);
      onChange();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
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
            <Form.Control size="sm" value={name} required placeholder="Vacaciones" onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="col-auto">
            <Form.Check type="checkbox" label="Computa saldo" checked={computesBalance} onChange={(e) => setComputesBalance(e.target.checked)} />
          </div>
          <div className="col-auto">
            <Form.Check type="checkbox" label="Requiere aprobación" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} />
          </div>
          <div className="col-auto">
            <Form.Check type="checkbox" label="Justificante" checked={requiresAttachment} onChange={(e) => setRequiresAttachment(e.target.checked)} />
          </div>
          <div className="col-auto">
            <Button size="sm" type="submit" className="btn-brand" disabled={saving}>
              {saving ? <Spinner as="span" size="sm" animation="border" /> : 'Añadir'}
            </Button>
          </div>
        </Form>

        <ul className="list-unstyled mb-0">
          {tipos.map((t) => (
            <li key={t.id} className="d-flex align-items-center gap-2 py-1 border-bottom">
              <span className="flex-grow-1">
                {t.name}
                {!t.active && <Badge bg="secondary-subtle" text="secondary" className="ms-2">inactivo</Badge>}
                {t.computesBalance && <Badge bg="info-subtle" text="info" className="ms-2">saldo</Badge>}
                {t.requiresApproval && <Badge bg="warning-subtle" text="warning" className="ms-2">aprobación</Badge>}
                {t.requiresAttachment && <Badge bg="secondary-subtle" text="secondary" className="ms-2">justificante</Badge>}
                {t.usos > 0 && <span className="text-secondary small ms-2">· {t.usos} uso/s</span>}
              </span>
              <Button size="sm" variant="outline-secondary" onClick={() => alternarActivo(t)}>{t.active ? 'Desactivar' : 'Activar'}</Button>
              <Button size="sm" variant="outline-danger" title="Borrar" onClick={() => borrar(t)} disabled={t.usos > 0}><Trash /></Button>
            </li>
          ))}
          {tipos.length === 0 && <li className="text-secondary small">Aún no hay tipos. Crea el primero (p.ej. Vacaciones).</li>}
        </ul>
      </Card.Body>
    </Card>
  );
}
