import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Spinner } from 'react-bootstrap';
import { PencilFill, PlusLg } from 'react-bootstrap-icons';
import {
  LABEL_CODES,
  variantCodes,
  variantFromCodes,
  variantLabel,
  type DestinationDto,
  type LabelCode,
} from '@yorga/contracts';
import { destinosGateway } from '../composition';
import { Column, DataTable, useMemoryTable } from '../components/table';

const VACIO = { code: '', name: '', importadoPor: '', codes: ['EAN'] as LabelCode[] };

/**
 * REQ-004 · Destinos. Hasta ahora abrir un cliente nuevo (un país, una sociedad) exigía tocar código
 * y desplegar. Aquí se hace solo, con dos límites que no son negociables: los destinos
 * **se desactivan, no se borran** (si no, los pedidos antiguos dejarían de tener sentido), y una
 * etiqueta tiene que llevar **al menos un código** (si no, no es una etiqueta).
 */
export function DestinosPage() {
  const [destinos, setDestinos] = useState<DestinationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  // Un solo formulario, en modal, para alta y edición: `editando` dice cuál de las dos es.
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<DestinationDto | null>(null);
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  // El error del formulario va DENTRO del modal: si fuera al aviso de la página quedaría detrás, y
  // parecería que no ha pasado nada.
  const [formError, setFormError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    destinosGateway
      .list()
      .then(setDestinos)
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

  function abrirEdicion(d: DestinationDto) {
    setEditando(d);
    setForm({ code: d.code, name: d.name, importadoPor: d.importadoPor, codes: variantCodes(d.variant) });
    setFormError('');
    setAbierto(true);
  }

  function cerrar() {
    setAbierto(false);
    setEditando(null);
    setForm(VACIO);
  }

  function toggleCode(c: LabelCode) {
    setForm((f) => ({ ...f, codes: f.codes.includes(c) ? f.codes.filter((x) => x !== c) : [...f.codes, c] }));
  }

  const variant = variantFromCodes(form.codes); // null = ningún código marcado

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!variant) return; // el botón ya está deshabilitado; esto es el cinturón
    setFormError('');
    setNotice('');
    setSaving(true);
    try {
      if (editando) {
        await destinosGateway.update(editando.id, { name: form.name, importadoPor: form.importadoPor, variant });
        setNotice(`Destino ${editando.code} actualizado.`);
      } else {
        const d = await destinosGateway.create({ ...form, variant });
        setNotice(`Destino ${d.code} creado. Ya se puede elegir al generar etiquetas.`);
      }
      cerrar();
      load();
    } catch (err) {
      // El modal se queda abierto, con lo escrito: si se cerrara habría que teclearlo todo otra vez.
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(d: DestinationDto) {
    setError('');
    setNotice('');
    setBusyId(d.id);
    try {
      await destinosGateway.update(d.id, { active: !d.active });
      setNotice(`${d.code} ${d.active ? 'desactivado: ya no aparece al generar' : 'activado'}.`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  // El valor CRUDO (`value`) es lo que se ordena y se filtra; `render` sólo decide cómo se ve.
  const columns = useMemo<Column<DestinationDto>[]>(
    () => [
      { key: 'code', label: 'código', value: (d) => d.code, render: (d) => <code>{d.code}</code> },
      { key: 'name', label: 'nombre', value: (d) => d.name },
      {
        key: 'variant',
        label: 'códigos que imprime',
        value: (d) => variantLabel(d.variant),
        render: (d) => <span className="variant-badge">{variantLabel(d.variant)}</span>,
      },
      { key: 'importadoPor', label: 'importado por', value: (d) => d.importadoPor },
      {
        key: 'active',
        label: 'estado',
        value: (d) => (d.active ? 'activo' : 'inactivo'),
        render: (d) =>
          d.active ? (
            <Badge bg="success-subtle" text="success">activo</Badge>
          ) : (
            <Badge bg="secondary-subtle" text="secondary">inactivo</Badge>
          ),
      },
      {
        key: 'acciones',
        label: 'acciones',
        align: 'end',
        sortable: false,
        filter: 'none',
        value: () => '',
        render: (d) => (
          <div className="d-inline-flex gap-2">
            <Button
              size="sm"
              variant="outline-secondary"
              disabled={busyId === d.id}
              aria-label={`Editar ${d.code}`}
              onClick={() => abrirEdicion(d)}
            >
              <PencilFill className="me-1" />
              editar
            </Button>
            <Button
              size="sm"
              variant={d.active ? 'outline-danger' : 'outline-success'}
              disabled={busyId === d.id}
              aria-label={`${d.active ? 'Desactivar' : 'Activar'} ${d.code}`}
              title={d.active ? 'Dejará de aparecer al generar' : 'Volverá a aparecer al generar'}
              onClick={() => toggleActivo(d)}
            >
              {d.active ? 'desactivar' : 'activar'}
            </Button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId],
  );

  const tabla = useMemoryTable(destinos, columns);

  return (
    <div className="page page-wide">
      <header className="page-head mb-4 d-flex justify-content-between align-items-start gap-3">
        <div>
          <h1 className="h4 mb-1">Destinos</h1>
          <p className="text-secondary mb-0">
            Qué destinos se pueden elegir al generar etiquetas, qué códigos de barras lleva cada uno y el
            «importado por» que se imprime.
          </p>
        </div>
        <Button className="btn-brand flex-shrink-0" onClick={abrirNuevo}>
          <PlusLg className="me-1" />
          Nuevo destino
        </Button>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}
      {notice && <Alert variant="success" onClose={() => setNotice('')} dismissible>{notice}</Alert>}

      <Card>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title className="mb-0">Destinos ({destinos.length})</Card.Title>
            {loading && <Spinner as="span" size="sm" animation="border" />}
          </div>
          <DataTable
            model={tabla}
            allRows={destinos}
            rowKey={(d) => String(d.id)}
            empty="Ningún destino cumple el filtro."
          />
        </Card.Body>
      </Card>

      <Modal show={abierto} onHide={cerrar} centered backdrop="static">
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">
              {editando ? `Editar destino ${editando.code}` : 'Nuevo destino'}
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {formError && <Alert variant="danger" className="py-2">⚠ {formError}</Alert>}

            <div className="row g-3">
              <div className="col-5">
                <Form.Label className="small" htmlFor="d-code">Código</Form.Label>
                <Form.Control
                  id="d-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="JAPON"
                  // El código es la identidad del destino: si se pudiera cambiar, dejaría de ser el mismo.
                  disabled={!!editando}
                  autoFocus={!editando}
                  required
                />
                {editando && <Form.Text muted>El código no se cambia: es la identidad del destino.</Form.Text>}
              </div>
              <div className="col-7">
                <Form.Label className="small" htmlFor="d-name">Nombre</Form.Label>
                <Form.Control
                  id="d-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Japón"
                  autoFocus={!!editando}
                  required
                />
                <Form.Text muted>Es lo que se ve en el desplegable al generar.</Form.Text>
              </div>

              <div className="col-12">
                <Form.Label className="small" htmlFor="d-importado">Importado por</Form.Label>
                <Form.Control
                  id="d-importado"
                  value={form.importadoPor}
                  onChange={(e) => setForm({ ...form, importadoPor: e.target.value })}
                  placeholder="VANYOR S.A.U"
                  required
                />
                <Form.Text muted>Se imprime tal cual en la etiqueta.</Form.Text>
              </div>

              <div className="col-12">
                <Form.Label className="small d-block mb-2">Códigos que imprime</Form.Label>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                  {LABEL_CODES.map((c) => (
                    <Form.Check
                      key={c}
                      type="checkbox"
                      id={`code-${c}`}
                      label={c}
                      checked={form.codes.includes(c)}
                      onChange={() => toggleCode(c)}
                    />
                  ))}
                  {variant && <span className="variant-badge ms-auto">{variantLabel(variant)}</span>}
                </div>
                {!variant && (
                  <div className="text-danger small mt-2">
                    Marca al menos uno: una etiqueta sin código no sirve.
                  </div>
                )}
              </div>
            </div>
          </Modal.Body>

          <Modal.Footer>
            <Button variant="outline-secondary" onClick={cerrar} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" className="btn-brand" disabled={saving || !variant}>
              {saving ? (
                <Spinner as="span" size="sm" animation="border" />
              ) : editando ? (
                'Guardar cambios'
              ) : (
                'Crear destino'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
