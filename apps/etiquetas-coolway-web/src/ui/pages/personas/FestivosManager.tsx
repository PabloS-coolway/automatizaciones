import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, Trash } from 'react-bootstrap-icons';
import type { CenterDto, HolidayDto } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';

/** Una línea del pegado masivo: "YYYY-MM-DD  Nombre" o "YYYY-MM-DD, Nombre" o "YYYY-MM-DD;Nombre". */
function parseLineas(texto: string): { date: string; name: string }[] {
  return texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d{4}-\d{2}-\d{2})[\s,;]+(.+)$/);
      return m ? { date: m[1], name: m[2].trim() } : { date: l, name: '' };
    });
}

/**
 * REQ-008 · Gestión de festivos (RRHH). Un festivo es de un centro o **global** (todos). Es informativo: no
 * descuenta saldo (las vacaciones son días naturales), pero se pinta en el calendario. Alta suelta o **masiva**
 * (pegar un listado del BOE/autonómico). Se identifica por (fecha, centro): no se duplica.
 */
export function FestivosManager() {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [centros, setCentros] = useState<CenterDto[]>([]);
  const [festivos, setFestivos] = useState<HolidayDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Alta suelta
  const [fecha, setFecha] = useState('');
  const [nombre, setNombre] = useState('');
  const [centerId, setCenterId] = useState<string>(''); // '' = global
  const [saving, setSaving] = useState(false);

  // Alta masiva
  const [bulk, setBulk] = useState('');
  const [bulkCenter, setBulkCenter] = useState<string>('');
  const [bulkSaving, setBulkSaving] = useState(false);

  const cargar = useCallback(() => {
    setLoading(true);
    Promise.all([rrhhGateway.listFestivos(year), rrhhGateway.listCentros().catch(() => [])])
      .then(([fs, cs]) => { setFestivos(fs); setCentros(cs); })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [year]);

  useEffect(() => cargar(), [cargar]);

  async function crear(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await rrhhGateway.crearFestivo({ date: fecha, name: nombre.trim(), centerId: centerId ? Number(centerId) : null });
      setFecha('');
      setNombre('');
      setNotice('Festivo añadido.');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function cargarMasivo(e: FormEvent) {
    e.preventDefault();
    setBulkSaving(true);
    setError('');
    setNotice('');
    try {
      const parsed = parseLineas(bulk);
      const r = await rrhhGateway.crearFestivosBulk({ centerId: bulkCenter ? Number(bulkCenter) : null, festivos: parsed });
      setNotice(`${r.creados} festivo(s) cargado(s)${r.saltados.length ? `; ${r.saltados.length} saltado(s): ${r.saltados.map((s) => `${s.date} (${s.motivo})`).join(', ')}` : ''}.`);
      setBulk('');
      cargar();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBulkSaving(false);
    }
  }

  async function borrar(f: HolidayDto) {
    if (!confirm(`¿Borrar el festivo "${f.name}" del ${f.date}?`)) return;
    setError('');
    try {
      await rrhhGateway.borrarFestivo(f.id);
      cargar();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Card>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <Card.Title className="h6 mb-0">Festivos</Card.Title>
          <div className="d-flex align-items-center gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => setYear((y) => y - 1)}><ChevronLeft /></Button>
            <span className="fw-semibold" style={{ minWidth: 60, textAlign: 'center' }}>{year}</span>
            <Button size="sm" variant="outline-secondary" onClick={() => setYear((y) => y + 1)}><ChevronRight /></Button>
          </div>
        </div>

        {error && <Alert variant="danger" className="py-2" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}
        {notice && <Alert variant="success" className="py-2" onClose={() => setNotice('')} dismissible>{notice}</Alert>}

        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <Form onSubmit={crear} className="mb-4">
              <div className="text-secondary small mb-2">Añadir un festivo</div>
              <div className="row g-2 align-items-end">
                <div className="col-auto">
                  <Form.Label className="small mb-1">Fecha</Form.Label>
                  <Form.Control size="sm" type="date" value={fecha} required onChange={(e) => setFecha(e.target.value)} />
                </div>
                <div className="col">
                  <Form.Label className="small mb-1">Nombre</Form.Label>
                  <Form.Control size="sm" value={nombre} required placeholder="Día de la Comunitat" onChange={(e) => setNombre(e.target.value)} />
                </div>
                <div className="col-12 col-md-auto">
                  <Form.Label className="small mb-1">Ámbito</Form.Label>
                  <Form.Select size="sm" value={centerId} onChange={(e) => setCenterId(e.target.value)}>
                    <option value="">Global (todos)</option>
                    {centros.map((c) => (<option key={c.id} value={c.id}>{c.name} · {c.brand}</option>))}
                  </Form.Select>
                </div>
                <div className="col-auto">
                  <Button size="sm" type="submit" className="btn-brand" disabled={saving}>
                    {saving ? <Spinner as="span" size="sm" animation="border" /> : 'Añadir'}
                  </Button>
                </div>
              </div>
            </Form>

            <Form onSubmit={cargarMasivo}>
              <div className="text-secondary small mb-2">Carga masiva (una por línea: <code>2026-01-01 Año Nuevo</code>)</div>
              <Form.Select size="sm" className="mb-2" style={{ maxWidth: 320 }} value={bulkCenter} onChange={(e) => setBulkCenter(e.target.value)}>
                <option value="">Global (todos)</option>
                {centros.map((c) => (<option key={c.id} value={c.id}>{c.name} · {c.brand}</option>))}
              </Form.Select>
              <Form.Control as="textarea" rows={5} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={'2026-01-01 Año Nuevo\n2026-01-06 Reyes\n2026-04-03 Viernes Santo'} className="mb-2" />
              <Button size="sm" type="submit" variant="outline-secondary" disabled={bulkSaving || !bulk.trim()}>
                {bulkSaving ? <Spinner as="span" size="sm" animation="border" /> : 'Cargar listado'}
              </Button>
            </Form>
          </div>

          <div className="col-12 col-lg-6">
            <div className="text-secondary small mb-2">Festivos de {year} ({festivos.length})</div>
            {loading ? (
              <Spinner animation="border" size="sm" />
            ) : festivos.length === 0 ? (
              <p className="text-secondary small mb-0">Sin festivos este año. Añade el primero.</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {festivos.map((f) => (
                  <li key={f.id} className="d-flex align-items-center gap-2 py-1 border-bottom">
                    <span className="text-secondary small" style={{ minWidth: 92 }}>{f.date}</span>
                    <span className="flex-grow-1">{f.name}</span>
                    <Badge bg={f.centerId ? 'info-subtle' : 'secondary-subtle'} text={f.centerId ? 'info' : 'secondary'}>
                      {f.centerName ?? 'Global'}
                    </Badge>
                    <Button size="sm" variant="outline-danger" title="Borrar" onClick={() => borrar(f)}><Trash /></Button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-secondary small mt-2 mb-0">Los festivos son informativos: no descuentan saldo (las vacaciones son días naturales), pero se marcan en el calendario.</p>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
