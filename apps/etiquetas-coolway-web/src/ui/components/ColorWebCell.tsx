import { useState } from 'react';
import { Button, Form, Spinner } from 'react-bootstrap';
import { Check, PencilSquare, X } from 'react-bootstrap-icons';

/**
 * REQ-009 · Celda editable del "color web" del maestro. Sólo se monta si el rol tiene la feature
 * `maestro.color-web.editar` (lo decide la página). Editar aquí propaga a todas las tallas de la
 * referencia+color y marca la edición para que la reimportación la respete.
 *
 * Por defecto se ELIGE de los valores existentes (para no crear uno nuevo por un typo); "valor nuevo"
 * es un paso explícito.
 */
export function ColorWebCell({
  value,
  options,
  onSave,
}: {
  value: string | null | undefined;
  /** Valores de "color web" que ya existen en el maestro. */
  options: string[];
  onSave: (valor: string, nuevo: boolean) => Promise<void>;
}) {
  const [editando, setEditando] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [valor, setValor] = useState(value ?? '');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  const etiqueta = value || '—';

  function abrir() {
    setValor(value ?? '');
    setNuevo(false);
    setError('');
    setEditando(true);
  }

  function cancelar() {
    setEditando(false);
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
      setEditando(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGuardando(false);
    }
  }

  if (!editando) {
    return (
      <span className="d-inline-flex align-items-center gap-2">
        <span>{etiqueta}</span>
        <Button
          variant="link"
          size="sm"
          className="p-0 text-secondary"
          aria-label={`Editar «color web»${value ? ` (${value})` : ''}`}
          onClick={abrir}
        >
          <PencilSquare aria-hidden="true" />
        </Button>
      </span>
    );
  }

  return (
    <div className="d-inline-flex flex-column gap-1" style={{ minWidth: '14rem' }}>
      <div className="d-inline-flex align-items-center gap-1">
        {nuevo ? (
          <Form.Control
            size="sm"
            value={valor}
            autoFocus
            placeholder="Nuevo color web"
            aria-label="Nuevo color web"
            onChange={(e) => setValor(e.target.value)}
            disabled={guardando}
          />
        ) : (
          <Form.Select
            size="sm"
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

        <Button
          variant="link"
          size="sm"
          className="p-0 text-success"
          aria-label="Guardar color web"
          onClick={guardar}
          disabled={guardando}
        >
          {guardando ? <Spinner as="span" size="sm" animation="border" /> : <Check aria-hidden="true" />}
        </Button>
        <Button
          variant="link"
          size="sm"
          className="p-0 text-secondary"
          aria-label="Cancelar edición"
          onClick={cancelar}
          disabled={guardando}
        >
          <X aria-hidden="true" />
        </Button>
      </div>

      <Form.Check
        type="checkbox"
        id={`nuevo-color-web-${value ?? 'vacio'}`}
        label="valor nuevo"
        className="small text-secondary"
        checked={nuevo}
        disabled={guardando}
        onChange={(e) => {
          setNuevo(e.target.checked);
          setValor(e.target.checked ? '' : (value ?? ''));
        }}
      />

      {error && <div className="text-danger small">{error}</div>}
    </div>
  );
}
