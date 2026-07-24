import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { PencilFill, PlusLg, Trash } from 'react-bootstrap-icons';
import type { SurtidoDto } from '@yorga/contracts';
import { surtidosGateway } from '../composition';
import { Column, DataTable, useMemoryTable } from '../components/table';

const VACIO = { ref: '', surtido: '' };

/**
 * REQ-010 · Fase 2 — Catálogo de surtidos. Silvia asigna a cada referencia el código de surtido (`SURTD`)
 * que quiere conservar; al podar el fichero de surtidos, se deja sólo ese (en vez de arrastrar todos los que
 * propone Access). Un surtido por referencia. Patrón de gestión igual que Destinos (REQ-004).
 */
export function SurtidosPage() {
  const [surtidos, setSurtidos] = useState<SurtidoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<SurtidoDto | null>(null);
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    surtidosGateway
      .list()
      .then(setSurtidos)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  function abrirNuevo() {
    setEditando(null);
    setForm(VACIO);
    setFormError('');
    setAbierto(true);
  }

  function abrirEdicion(s: SurtidoDto) {
    setEditando(s);
    setForm({ ref: s.ref, surtido: s.surtido });
    setFormError('');
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setEditando(null);
    setForm(VACIO);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    setNotice('');
    setSaving(true);
    try {
      if (editando) {
        await surtidosGateway.update(editando.id, { surtido: form.surtido });
        setNotice(`Surtido de la ref ${editando.ref} actualizado.`);
      } else {
        const s = await surtidosGateway.create(form);
        setNotice(`Surtido ${s.surtido} asignado a la ref ${s.ref}.`);
      }
      cerrar();
      load();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function quitar(s: SurtidoDto) {
    if (!confirm(`¿Quitar el surtido asignado a la ref ${s.ref}?`)) return;
    setError('');
    setNotice('');
    setBusyId(s.id);
    try {
      await surtidosGateway.remove(s.id);
      setNotice(`Surtido de la ref ${s.ref} quitado.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<Column<SurtidoDto>[]>(
    () => [
      { key: 'ref', label: 'referencia', value: (s) => s.ref, render: (s) => <code>{s.ref}</code> },
      { key: 'surtido', label: 'surtido (SURTD)', value: (s) => s.surtido, render: (s) => <code>{s.surtido}</code> },
      {
        key: 'acciones',
        label: 'acciones',
        align: 'end',
        sortable: false,
        filter: 'none',
        value: () => '',
        render: (s) => (
          <div className="d-inline-flex gap-2">
            <Button size="sm" variant="outline-secondary" disabled={busyId === s.id} aria-label={`Editar ${s.ref}`} onClick={() => abrirEdicion(s)}>
              <PencilFill className="me-1" />
              editar
            </Button>
            <Button size="sm" variant="outline-danger" disabled={busyId === s.id} aria-label={`Quitar ${s.ref}`} onClick={() => quitar(s)}>
              <Trash className="me-1" />
              quitar
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId],
  );

  const tabla = useMemoryTable(surtidos, columns);

  return (
    <div className="page page-wide">
      <header className="page-head mb-4 d-flex justify-content-between align-items-start gap-3">
        <div>
          <h1 className="h4 mb-1">Surtidos</h1>
          <p className="text-secondary mb-0">
            Qué surtido (código <code>SURTD</code> de SAP) conservar por referencia al podar. Sin asignación, la
            poda deja todos los surtidos que trae el fichero.
          </p>
        </div>
        <Button className="btn-brand flex-shrink-0" onClick={abrirNuevo}>
          <PlusLg className="me-1" />
          Asignar surtido
        </Button>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}
      {notice && <Alert variant="success" onClose={() => setNotice('')} dismissible>{notice}</Alert>}

      <Card>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title className="mb-0">Surtidos ({surtidos.length})</Card.Title>
            {loading && <Spinner as="span" size="sm" animation="border" />}
          </div>
          <DataTable model={tabla} allRows={surtidos} rowKey={(s) => String(s.id)} empty="Ningún surtido asignado todavía." />
        </Card.Body>
      </Card>

      <Modal show={abierto} onHide={cerrar} centered backdrop="static">
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">{editando ? `Editar surtido de ${editando.ref}` : 'Asignar surtido'}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {formError && <Alert variant="danger" className="py-2">⚠ {formError}</Alert>}

            <div className="row g-3">
              <div className="col-6">
                <Form.Label className="small" htmlFor="s-ref">Referencia</Form.Label>
                <Form.Control
                  id="s-ref"
                  value={form.ref}
                  onChange={(e) => setForm({ ...form, ref: e.target.value })}
                  placeholder="7613553"
                  disabled={!!editando}
                  autoFocus={!editando}
                  required
                />
                {editando && <Form.Text muted>La ref no se cambia: es la identidad.</Form.Text>}
              </div>
              <div className="col-6">
                <Form.Label className="small" htmlFor="s-surtido">Surtido (SURTD)</Form.Label>
                <Form.Control
                  id="s-surtido"
                  value={form.surtido}
                  onChange={(e) => setForm({ ...form, surtido: e.target.value.toUpperCase() })}
                  placeholder="0G2"
                  autoFocus={!!editando}
                  required
                />
                <Form.Text muted>El código que aparece en el fichero de surtidos.</Form.Text>
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={cerrar} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="btn-brand" disabled={saving}>
              {saving ? <Spinner as="span" size="sm" animation="border" /> : editando ? 'Guardar cambios' : 'Asignar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
