import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import { PlusLg } from 'react-bootstrap-icons';
import { LABEL_VARIANTS, type DestinationDto, type LabelVariant, type UpdateDestinationDto } from '@yorga/contracts';
import { destinosGateway } from '../composition';
import { Column, DataTable, useMemoryTable } from '../components/table';

/** Cómo se lee una variante en la pantalla: "UPC_EAN" no dice nada; "UPC + EAN" sí. */
const VARIANTE_LEGIBLE: Record<LabelVariant, string> = {
  EAN: 'EAN',
  UPC: 'UPC',
  CODE128_EAN: 'CODE128 + EAN',
  UPC_EAN: 'UPC + EAN',
};

/**
 * REQ-004 · Destinos. Hasta ahora abrir un cliente nuevo (un país, una sociedad) exigía tocar código
 * y desplegar. Aquí se hace solo, pero con dos límites que no son negociables:
 * la **variante** es una lista cerrada (es lo que el motor sabe imprimir) y los destinos
 * **se desactivan, no se borran** (si no, los pedidos antiguos dejarían de tener sentido).
 */
export function DestinosPage() {
  const [destinos, setDestinos] = useState<DestinationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  // Alta
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [variant, setVariant] = useState<LabelVariant>('EAN');
  const [importadoPor, setImportadoPor] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    destinosGateway
      .list()
      .then(setDestinos)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setCreating(true);
    try {
      const d = await destinosGateway.create({ code, name, variant, importadoPor });
      setNotice(`Destino ${d.code} creado. Ya se puede elegir al generar etiquetas.`);
      setCode('');
      setName('');
      setImportadoPor('');
      setVariant('EAN');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: number, data: UpdateDestinationDto, ok: string) {
    setError('');
    setNotice('');
    setBusyId(id);
    try {
      await destinosGateway.update(id, data);
      setNotice(ok);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function editar(d: DestinationDto, campo: 'name' | 'importadoPor', etiqueta: string) {
    const valor = window.prompt(`${etiqueta} de ${d.code}:`, d[campo]);
    if (valor == null || valor.trim() === d[campo]) return;
    patch(d.id, { [campo]: valor }, `${etiqueta} de ${d.code} actualizado.`);
  }

  // El valor CRUDO (`value`) es lo que se ordena y se filtra; `render` sólo decide cómo se ve.
  const columns = useMemo<Column<DestinationDto>[]>(
    () => [
      { key: 'code', label: 'código', value: (d) => d.code, render: (d) => <code>{d.code}</code> },
      { key: 'name', label: 'nombre', value: (d) => d.name },
      {
        key: 'variant',
        label: 'códigos que imprime',
        value: (d) => VARIANTE_LEGIBLE[d.variant],
        render: (d) => <span className="variant-badge">{VARIANTE_LEGIBLE[d.variant]}</span>,
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
        render: (d) => {
          const busy = busyId === d.id;
          return (
            <div className="d-inline-flex gap-2">
              <Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => editar(d, 'name', 'Nombre')}>
                nombre
              </Button>
              <Button
                size="sm"
                variant="outline-secondary"
                disabled={busy}
                title="Texto que se imprime en la etiqueta"
                onClick={() => editar(d, 'importadoPor', 'Importado por')}
              >
                importado por
              </Button>
              <Form.Select
                size="sm"
                style={{ width: 'auto' }}
                value={d.variant}
                disabled={busy}
                title="Cambia los códigos de barras que llevará la etiqueta"
                onChange={(e) =>
                  patch(
                    d.id,
                    { variant: e.target.value as LabelVariant },
                    `${d.code} imprimirá ${VARIANTE_LEGIBLE[e.target.value as LabelVariant]}.`,
                  )
                }
              >
                {LABEL_VARIANTS.map((v) => (
                  <option key={v} value={v}>
                    {VARIANTE_LEGIBLE[v]}
                  </option>
                ))}
              </Form.Select>
              <Button
                size="sm"
                variant={d.active ? 'outline-danger' : 'outline-success'}
                disabled={busy}
                title={d.active ? 'Dejará de aparecer al generar' : 'Volverá a aparecer al generar'}
                onClick={() => patch(d.id, { active: !d.active }, `${d.code} ${d.active ? 'desactivado' : 'activado'}.`)}
              >
                {d.active ? 'desactivar' : 'activar'}
              </Button>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busyId],
  );

  const tabla = useMemoryTable(destinos, columns);

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Destinos</h1>
        <p className="text-secondary mb-0">
          Qué destinos se pueden elegir al generar etiquetas, qué códigos de barras lleva cada uno y el
          «importado por» que se imprime.
        </p>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}
      {notice && <Alert variant="success" onClose={() => setNotice('')} dismissible>{notice}</Alert>}

      <Card className="mb-4">
        <Card.Body className="p-4">
          <Card.Title className="mb-3">Nuevo destino</Card.Title>
          <Form onSubmit={onCreate}>
            <div className="row g-3 align-items-end">
              <div className="col-md-2">
                <Form.Label className="small">Código</Form.Label>
                <Form.Control
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="JAPON"
                  required
                />
              </div>
              <div className="col-md-3">
                <Form.Label className="small">Nombre</Form.Label>
                <Form.Control value={name} onChange={(e) => setName(e.target.value)} placeholder="Japón" required />
              </div>
              <div className="col-md-3">
                <Form.Label className="small">Códigos que imprime</Form.Label>
                <Form.Select value={variant} onChange={(e) => setVariant(e.target.value as LabelVariant)}>
                  {LABEL_VARIANTS.map((v) => (
                    <option key={v} value={v}>
                      {VARIANTE_LEGIBLE[v]}
                    </option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-md-3">
                <Form.Label className="small">Importado por</Form.Label>
                <Form.Control
                  value={importadoPor}
                  onChange={(e) => setImportadoPor(e.target.value)}
                  placeholder="VANYOR S.A.U"
                  required
                />
              </div>
              <div className="col-md-1">
                <Button type="submit" className="btn-brand w-100" disabled={creating} title="Crear destino">
                  {creating ? <Spinner as="span" size="sm" animation="border" /> : <PlusLg />}
                </Button>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>

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
    </div>
  );
}
