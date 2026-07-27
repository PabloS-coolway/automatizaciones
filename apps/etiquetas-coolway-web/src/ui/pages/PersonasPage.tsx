import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { PencilSquare, PersonDash, PersonCheck, PlusLg } from 'react-bootstrap-icons';
import {
  RRHH_ROLE_LABELS,
  RRHH_ROLES,
  type EmployeeDto,
  type RrhhMeDto,
  type RrhhRole,
} from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { Column, DataTable, useMemoryTable } from '../components/table';

const VACIO = { email: '', fullName: '', rrhhRole: 'EMPLEADO' as RrhhRole, position: '', managerId: '' };

/**
 * REQ-008 · Personas. El empleado entra con su usuario del panel; aquí ve su ficha y (según su rol RRHH) la
 * plantilla que le corresponde. RRHH/Admin gestiona la plantilla: **alta** (enlazando a un usuario existente),
 * **edición** de la ficha, asignación de **responsable** (organigrama) y **baja/reactivación**. Todo el dominio
 * de RRHH es independiente del resto del panel; sólo se comparte la identidad (login por correo).
 */
export function PersonasPage() {
  const [me, setMe] = useState<RrhhMeDto | null>(null);
  const [empleados, setEmpleados] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const puedeGestionar = me?.employee?.rrhhRole === 'RRHH' || me?.employee?.rrhhRole === 'ADMIN';

  const load = useCallback(() => {
    setLoading(true);
    rrhhGateway
      .me()
      .then(async (m) => {
        setMe(m);
        if (m.employee) setEmpleados(await rrhhGateway.listEmpleados());
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const nombrePorId = useMemo(() => new Map(empleados.map((e) => [e.id, e.fullName])), [empleados]);

  function abrirAlta() {
    setEditId(null);
    setForm(VACIO);
    setFormError('');
    setAbierto(true);
  }

  function abrirEdicion(e: EmployeeDto) {
    setEditId(e.id);
    setForm({
      email: e.email,
      fullName: e.fullName,
      rrhhRole: e.rrhhRole,
      position: e.position ?? '',
      managerId: e.managerId != null ? String(e.managerId) : '',
    });
    setFormError('');
    setAbierto(true);
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError('');
    setNotice('');
    setSaving(true);
    const managerId = form.managerId ? Number(form.managerId) : null;
    try {
      if (editId == null) {
        const nuevo = await rrhhGateway.crearEmpleado({
          email: form.email,
          fullName: form.fullName,
          rrhhRole: form.rrhhRole,
          position: form.position || undefined,
          managerId: managerId ?? undefined,
        });
        setNotice(`${nuevo.fullName} dado de alta y enlazado a ${nuevo.email}.`);
      } else {
        const upd = await rrhhGateway.editarEmpleado(editId, {
          fullName: form.fullName,
          rrhhRole: form.rrhhRole,
          position: form.position || null,
          managerId,
        });
        setNotice(`Ficha de ${upd.fullName} actualizada.`);
      }
      setAbierto(false);
      setForm(VACIO);
      load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function cambiarEstado(e: EmployeeDto) {
    setError('');
    setNotice('');
    setBusyId(e.id);
    try {
      const r = e.active ? await rrhhGateway.darDeBaja(e.id) : await rrhhGateway.reactivar(e.id);
      setNotice(r.active ? `${r.fullName} reactivado.` : `${r.fullName} dado de baja.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<Column<EmployeeDto>[]>(() => {
    const base: Column<EmployeeDto>[] = [
      { key: 'fullName', label: 'nombre', value: (e) => e.fullName, render: (e) => <strong>{e.fullName}</strong> },
      { key: 'email', label: 'correo', value: (e) => e.email },
      { key: 'position', label: 'puesto', value: (e) => e.position ?? '', render: (e) => e.position ?? '—' },
      {
        key: 'rrhhRole',
        label: 'rol',
        value: (e) => RRHH_ROLE_LABELS[e.rrhhRole],
        render: (e) => <Badge bg="secondary-subtle" text="secondary">{RRHH_ROLE_LABELS[e.rrhhRole]}</Badge>,
      },
      {
        key: 'managerId',
        label: 'responsable',
        value: (e) => (e.managerId != null ? nombrePorId.get(e.managerId) ?? `#${e.managerId}` : ''),
        render: (e) => (e.managerId != null ? nombrePorId.get(e.managerId) ?? `#${e.managerId}` : '—'),
      },
      { key: 'center', label: 'centro / marca', value: (e) => [e.center, e.brand].filter(Boolean).join(' · '), render: (e) => [e.center, e.brand].filter(Boolean).join(' · ') || '—' },
      {
        key: 'active',
        label: 'estado',
        value: (e) => (e.active ? 'activo' : 'baja'),
        render: (e) =>
          e.active ? (
            <Badge bg="success-subtle" text="success">activo</Badge>
          ) : (
            <Badge bg="secondary-subtle" text="secondary">baja</Badge>
          ),
      },
    ];
    if (!puedeGestionar) return base;
    return [
      ...base,
      {
        key: 'acciones',
        label: '',
        sortable: false,
        value: () => '',
        render: (e) => (
          <div className="d-flex gap-1 justify-content-end">
            <Button size="sm" variant="outline-secondary" title="Editar ficha" onClick={() => abrirEdicion(e)} disabled={busyId === e.id}>
              <PencilSquare />
            </Button>
            <Button
              size="sm"
              variant={e.active ? 'outline-danger' : 'outline-success'}
              title={e.active ? 'Dar de baja' : 'Reactivar'}
              onClick={() => cambiarEstado(e)}
              disabled={busyId === e.id}
            >
              {busyId === e.id ? <Spinner as="span" size="sm" animation="border" /> : e.active ? <PersonDash /> : <PersonCheck />}
            </Button>
          </div>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeGestionar, nombrePorId, busyId]);

  const tabla = useMemoryTable(empleados, columns);

  // Posibles responsables al editar/dar de alta: cualquier empleado salvo el que se edita (no puede ser su propio jefe).
  const posiblesResponsables = useMemo(
    () => empleados.filter((e) => e.id !== editId),
    [empleados, editId],
  );

  if (loading) {
    return (
      <div className="page page-wide">
        <Spinner animation="border" size="sm" className="me-2" /> Cargando…
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <header className="page-head mb-4 d-flex justify-content-between align-items-start gap-3">
        <div>
          <h1 className="h4 mb-1">Personas</h1>
          <p className="text-secondary mb-0">Gestión de personal del grupo. Cada empleado entra con su usuario del panel.</p>
        </div>
        {puedeGestionar && (
          <Button className="btn-brand flex-shrink-0" onClick={abrirAlta}>
            <PlusLg className="me-1" />
            Nuevo empleado
          </Button>
        )}
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}
      {notice && <Alert variant="success" onClose={() => setNotice('')} dismissible>{notice}</Alert>}

      {!me?.employee ? (
        <Alert variant="light" className="border">
          Aún no tienes <strong>ficha de empleado</strong> en el módulo de personal. Cuando RRHH te dé de alta,
          verás aquí tu ficha y la de tu equipo.
        </Alert>
      ) : (
        <Card>
          <Card.Body className="p-4">
            <Card.Title className="mb-3">Plantilla ({empleados.length})</Card.Title>
            <DataTable model={tabla} allRows={empleados} rowKey={(e) => String(e.id)} empty="No hay empleados visibles." />
          </Card.Body>
        </Card>
      )}

      <Modal show={abierto} onHide={() => setAbierto(false)} centered backdrop="static">
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">{editId == null ? 'Nuevo empleado' : 'Editar ficha'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <Alert variant="danger" className="py-2">⚠ {formError}</Alert>}
            {editId == null ? (
              <p className="text-secondary small">
                Se enlaza con un <strong>usuario que ya existe</strong> (por su correo). Si no existe, créalo antes en
                Usuarios.
              </p>
            ) : (
              <p className="text-secondary small">
                El correo/usuario no se cambia desde aquí. Se edita nombre, puesto, rol y responsable.
              </p>
            )}
            <div className="row g-3">
              <div className="col-12">
                <Form.Label className="small" htmlFor="e-email">Correo del usuario</Form.Label>
                <Form.Control id="e-email" type="email" value={form.email} autoFocus={editId == null} required={editId == null}
                  disabled={editId != null}
                  onChange={(ev) => setForm({ ...form, email: ev.target.value })} placeholder="nombre@grupoyorga.com" />
              </div>
              <div className="col-7">
                <Form.Label className="small" htmlFor="e-name">Nombre completo</Form.Label>
                <Form.Control id="e-name" value={form.fullName} required autoFocus={editId != null}
                  onChange={(ev) => setForm({ ...form, fullName: ev.target.value })} placeholder="Ana García" />
              </div>
              <div className="col-5">
                <Form.Label className="small" htmlFor="e-role">Rol RRHH</Form.Label>
                <Form.Select id="e-role" value={form.rrhhRole} onChange={(ev) => setForm({ ...form, rrhhRole: ev.target.value as RrhhRole })}>
                  {RRHH_ROLES.map((r) => (
                    <option key={r} value={r}>{RRHH_ROLE_LABELS[r]}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-7">
                <Form.Label className="small" htmlFor="e-pos">Puesto (opcional)</Form.Label>
                <Form.Control id="e-pos" value={form.position} onChange={(ev) => setForm({ ...form, position: ev.target.value })} placeholder="Dependienta" />
              </div>
              <div className="col-5">
                <Form.Label className="small" htmlFor="e-mgr">Responsable</Form.Label>
                <Form.Select id="e-mgr" value={form.managerId} onChange={(ev) => setForm({ ...form, managerId: ev.target.value })}>
                  <option value="">— Sin responsable —</option>
                  {posiblesResponsables.map((e) => (
                    <option key={e.id} value={e.id}>{e.fullName}</option>
                  ))}
                </Form.Select>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setAbierto(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="btn-brand" disabled={saving}>
              {saving ? <Spinner as="span" size="sm" animation="border" /> : editId == null ? 'Dar de alta' : 'Guardar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
