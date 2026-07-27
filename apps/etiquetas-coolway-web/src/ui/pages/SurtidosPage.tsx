import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, InputGroup, Spinner } from 'react-bootstrap';
import { PlusLg, X } from 'react-bootstrap-icons';
import { SURTIDO_GRUPOS, SURTIDO_GRUPO_LABELS, type PodaSurtidoDto } from '@yorga/contracts';
import { surtidosGateway } from '../composition';

/**
 * REQ-011 · Catálogo de surtidos por GRUPO de prefijo de referencia (76 chica / 86 chico). Silvia da de alta
 * los códigos SURTD que usa en cada grupo; al podar (si lo activa) el fichero de surtidos sale sólo con esos.
 * Sustituye el modelo por-referencia anterior.
 */
export function SurtidosPage() {
  const [items, setItems] = useState<PodaSurtidoDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [nuevo, setNuevo] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    surtidosGateway
      .list()
      .then(setItems)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  const porGrupo = useMemo(() => {
    const m: Record<string, PodaSurtidoDto[]> = {};
    for (const g of SURTIDO_GRUPOS) m[g] = [];
    for (const s of items) (m[s.grupo] ??= []).push(s);
    return m;
  }, [items]);

  async function agregar(grupo: string) {
    const codigo = (nuevo[grupo] ?? '').trim().toUpperCase();
    if (!codigo) return;
    setError('');
    setAdding(grupo);
    try {
      await surtidosGateway.agregar({ grupo, codigo });
      setNuevo((n) => ({ ...n, [grupo]: '' }));
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdding(null);
    }
  }

  async function quitar(s: PodaSurtidoDto) {
    setError('');
    setBusyId(s.id);
    try {
      await surtidosGateway.quitar(s.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Surtidos</h1>
        <p className="text-secondary mb-0">
          Qué surtidos (código <code>SURTD</code>) conservar por <strong>grupo de referencia</strong> al podar.
          Al podar, actívalo y el fichero de surtidos saldrá sólo con los de cada grupo.
        </p>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

      {loading ? (
        <div><Spinner animation="border" size="sm" className="me-2" /> Cargando…</div>
      ) : (
        <div className="row g-3">
          {SURTIDO_GRUPOS.map((grupo) => (
            <div className="col-md-6" key={grupo}>
              <Card className="h-100">
                <Card.Body className="p-4">
                  <Card.Title className="mb-1">{SURTIDO_GRUPO_LABELS[grupo]}</Card.Title>
                  <p className="text-secondary small">Referencias que empiezan por <code>{grupo}</code>.</p>

                  <div className="d-flex flex-wrap gap-2 mb-3">
                    {porGrupo[grupo].length === 0 && <span className="text-secondary small">Ningún surtido todavía.</span>}
                    {porGrupo[grupo].map((s) => (
                      <Badge key={s.id} bg="light" text="dark" className="border d-inline-flex align-items-center gap-1 py-2">
                        <code>{s.codigo}</code>
                        <Button
                          variant="link"
                          size="sm"
                          className="p-0 text-danger lh-1"
                          aria-label={`Quitar ${s.codigo} de ${grupo}`}
                          disabled={busyId === s.id}
                          onClick={() => quitar(s)}
                        >
                          <X />
                        </Button>
                      </Badge>
                    ))}
                  </div>

                  <InputGroup size="sm">
                    <Form.Control
                      value={nuevo[grupo] ?? ''}
                      maxLength={3}
                      placeholder="Código (3 car.)"
                      aria-label={`Nuevo surtido en ${grupo}`}
                      onChange={(e) => setNuevo((n) => ({ ...n, [grupo]: e.target.value.toUpperCase() }))}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), agregar(grupo))}
                    />
                    <Button variant="outline-secondary" disabled={adding === grupo} onClick={() => agregar(grupo)}>
                      {adding === grupo ? <Spinner as="span" size="sm" animation="border" /> : <><PlusLg className="me-1" />Añadir</>}
                    </Button>
                  </InputGroup>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
