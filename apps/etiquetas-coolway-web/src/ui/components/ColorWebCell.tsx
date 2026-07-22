import { useState } from 'react';
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';
import { PencilSquare } from 'react-bootstrap-icons';

/**
 * REQ-009 · Editar el "color web" del maestro. La celda muestra el valor con un botón que abre un
 * MODAL con el formulario. Sólo se monta si el rol tiene la feature `maestro.color-web.editar`.
 *
 * La edición **propaga a todas las tallas** de la referencia+color y marca la fila para que la
 * reimportación la respete. Por defecto se ELIGE de los valores existentes (no se crea uno por un
 * typo); "valor nuevo" es un paso explícito.
 */
export function ColorWebCell({
  value,
  options,
  refCodigo,
  color,
  onSave,
}: {
  value: string | null | undefined;
  /** Valores de "color web" que ya existen en el maestro. */
  options: string[];
  /** Referencia y color de la fila (identidad de la edición y contexto del modal). */
  refCodigo: string;
  color: string;
  onSave: (valor: string, nuevo: boolean) => Promise<void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [valor, setValor] = useState(value ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  function abrir() {
    setValor(value ?? '');
    setNuevo(false);
    setError('');
    setAbierto(true);
  }

  function cerrar() {
    if (guardando) return; // no cerrar a medias de un guardado
    setAbierto(false);
    setError('');
  }

  async function guardar() {
    const limpio = valor.trim();
    if (!limpio) {
      setError('El «color web» no puede quedar vacío.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await onSave(limpio, nuevo);
      setAbierto(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <span className="d-inline-flex align-items-center gap-2">
        <span>{value || '—'}</span>
        <Button
          variant="link"
          size="sm"
          className="p-0 text-secondary"
          aria-label={`Editar «color web» de ${refCodigo} ${color}`}
          onClick={abrir}
        >
          <PencilSquare aria-hidden="true" />
        </Button>
      </span>

      <Modal show={abierto} onHide={cerrar} centered backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title className="h5">Editar «color web»</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p className="text-secondary small mb-3">
            Referencia <strong>{refCodigo}</strong> · color <strong>{color}</strong>
          </p>

          <Form.Group className="mb-3">
            <Form.Label className="small">color web</Form.Label>
            {nuevo ? (
              <Form.Control
                value={valor}
                autoFocus
                placeholder="Nuevo color web"
                aria-label="Nuevo color web"
                onChange={(e) => setValor(e.target.value)}
                disabled={guardando}
              />
            ) : (
              <Form.Select
                value={valor}
                aria-label="Elegir color web"
                onChange={(e) => setValor(e.target.value)}
                disabled={guardando}
              >
                {/* Si el valor actual no está entre las opciones (raro), se ofrece igual para no perderlo. */}
                {value && !options.includes(value) && <option value={value}>{value}</option>}
                <option value="" disabled>
                  Elegir…
                </option>
                {options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>

          <Form.Check
            type="checkbox"
            id="color-web-valor-nuevo"
            label="valor nuevo (no está en la lista)"
            className="small text-secondary mb-3"
            checked={nuevo}
            disabled={guardando}
            onChange={(e) => {
              setNuevo(e.target.checked);
              setValor(e.target.checked ? '' : (value ?? ''));
            }}
          />

          <Alert variant="light" className="small border mb-0">
            Se aplicará a <strong>todas las tallas</strong> de esta referencia, y la reimportación del maestro
            <strong> respetará</strong> este valor a partir de ahora.
          </Alert>

          {error && (
            <Alert variant="danger" className="small mt-3 mb-0">
              {error}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={cerrar} disabled={guardando}>
            Cancelar
          </Button>
          <Button className="btn-brand" onClick={guardar} disabled={guardando}>
            {guardando ? (
              <>
                <Spinner as="span" size="sm" animation="border" className="me-2" /> Guardando…
              </>
            ) : (
              'Guardar'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
