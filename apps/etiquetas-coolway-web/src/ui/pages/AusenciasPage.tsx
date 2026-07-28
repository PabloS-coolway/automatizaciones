import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Nav, Spinner } from 'react-bootstrap';
import {
  ESTADO_AUSENCIA_LABELS,
  type AbsenceDto,
  type AbsenceTypeDto,
  type EstadoAusencia,
  type SaldoVacacionesDto,
} from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { useRrhh } from '../rrhh/RrhhContext';
import { TiposAusenciaManager } from './personas/TiposAusenciaManager';

const VARIANTE: Record<EstadoAusencia, string> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };
type Vista = 'mias' | 'aprobaciones' | 'calendario' | 'tipos';

/** Hoy y +90 días en YYYY-MM-DD, para el calendario de equipo. */
function rango90(): { desde: string; hasta: string } {
  const hoy = new Date();
  const fin = new Date(hoy);
  fin.setDate(fin.getDate() + 90);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { desde: iso(hoy), hasta: iso(fin) };
}

/**
 * REQ-008 Fase 3 · Ausencias. El empleado solicita y ve sus solicitudes; el responsable/RRHH aprueba las de su
 * equipo; RRHH administra el catálogo de tipos.
 */
export function AusenciasPage() {
  const { employee, loading: rrhhLoading } = useRrhh();
  const puedeAprobar = employee != null && employee.rrhhRole !== 'EMPLEADO';
  const puedeGestionar = employee?.rrhhRole === 'RRHH' || employee?.rrhhRole === 'ADMIN';

  const [vista, setVista] = useState<Vista>('mias');
  const [mias, setMias] = useState<AbsenceDto[]>([]);
  const [pendientes, setPendientes] = useState<AbsenceDto[]>([]);
  const [tipos, setTipos] = useState<AbsenceTypeDto[]>([]);
  const [saldo, setSaldo] = useState<SaldoVacacionesDto | null>(null);
  const [calendario, setCalendario] = useState<AbsenceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({ typeId: '', startDate: '', endDate: '', halfDay: false, reason: '' });
  const [saving, setSaving] = useState(false);

  const reload = useCallback(() => {
    if (!employee) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      rrhhGateway.misAusencias(),
      rrhhGateway.listTiposAusencia(),
      puedeAprobar ? rrhhGateway.ausenciasPendientes() : Promise.resolve([]),
      rrhhGateway.miSaldo().catch(() => null),
    ])
      .then(([m, t, p, s]) => {
        setMias(m);
        setTipos(t);
        setPendientes(p);
        setSaldo(s);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [employee, puedeAprobar]);

  useEffect(() => reload(), [reload]);

  // El calendario de equipo se carga al abrir su pestaña.
  useEffect(() => {
    if (vista === 'calendario' && puedeAprobar) {
      const { desde, hasta } = rango90();
      rrhhGateway.calendarioAusencias(desde, hasta).then((c) => setCalendario(c.ausencias)).catch((e) => setError((e as Error).message));
    }
  }, [vista, puedeAprobar]);

  const tiposActivos = useMemo(() => tipos.filter((t) => t.active), [tipos]);

  async function solicitar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await rrhhGateway.solicitarAusencia({
        typeId: Number(form.typeId),
        startDate: form.startDate,
        endDate: form.endDate,
        halfDay: form.halfDay,
        reason: form.reason || undefined,
      });
      setNotice('Solicitud enviada.');
      setForm({ typeId: '', startDate: '', endDate: '', halfDay: false, reason: '' });
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function decidir(a: AbsenceDto, aprobar: boolean) {
    setError('');
    setNotice('');
    try {
      await rrhhGateway.decidirAusencia(a.id, aprobar);
      setNotice(`Solicitud de ${a.employeeName} ${aprobar ? 'aprobada' : 'rechazada'}.`);
      reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (rrhhLoading || loading) {
    return (
      <div className="page">
        <Spinner animation="border" size="sm" className="me-2" /> Cargando…
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="page">
        <Alert variant="light" className="border">
          Aún no tienes <strong>ficha de empleado</strong>: no puedes gestionar ausencias hasta que RRHH te dé de alta.
        </Alert>
      </div>
    );
  }

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Ausencias y vacaciones</h1>
        <p className="text-secondary mb-0">Solicita tus ausencias y consulta su estado.</p>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}
      {notice && <Alert variant="success" onClose={() => setNotice('')} dismissible>{notice}</Alert>}

      <Nav variant="tabs" activeKey={vista} onSelect={(k) => setVista((k as Vista) ?? 'mias')} className="mb-3">
        <Nav.Item><Nav.Link eventKey="mias">Mis ausencias</Nav.Link></Nav.Item>
        {puedeAprobar && (
          <Nav.Item><Nav.Link eventKey="aprobaciones">Aprobaciones {pendientes.length > 0 && <Badge bg="warning" text="dark">{pendientes.length}</Badge>}</Nav.Link></Nav.Item>
        )}
        {puedeAprobar && <Nav.Item><Nav.Link eventKey="calendario">Calendario</Nav.Link></Nav.Item>}
        {puedeGestionar && <Nav.Item><Nav.Link eventKey="tipos">Tipos</Nav.Link></Nav.Item>}
      </Nav>

      {vista === 'mias' && (
        <div className="row g-4">
          <div className="col-12 col-lg-5">
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-3">Solicitar ausencia</Card.Title>
                <Form onSubmit={solicitar}>
                  <Form.Group className="mb-2">
                    <Form.Label className="small">Tipo</Form.Label>
                    <Form.Select value={form.typeId} required onChange={(e) => setForm({ ...form, typeId: e.target.value })}>
                      <option value="">— Elegir —</option>
                      {tiposActivos.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}{t.requiresApproval ? '' : ' (sin aprobación)'}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <div className="row g-2 mb-2">
                    <div className="col">
                      <Form.Label className="small">Desde</Form.Label>
                      <Form.Control type="date" value={form.startDate} required onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: form.endDate || e.target.value })} />
                    </div>
                    <div className="col">
                      <Form.Label className="small">Hasta</Form.Label>
                      <Form.Control type="date" value={form.endDate} required onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                    </div>
                  </div>
                  <Form.Check className="mb-2" type="checkbox" label="Medio día" checked={form.halfDay} onChange={(e) => setForm({ ...form, halfDay: e.target.checked })} />
                  <Form.Group className="mb-3">
                    <Form.Label className="small">Motivo (opcional)</Form.Label>
                    <Form.Control as="textarea" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                  </Form.Group>
                  <Button type="submit" className="btn-brand w-100" disabled={saving}>
                    {saving ? <Spinner as="span" size="sm" animation="border" /> : 'Enviar solicitud'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </div>
          <div className="col-12 col-lg-7">
            {saldo && saldo.anual > 0 && (
              <Card className="mb-3">
                <Card.Body className="d-flex justify-content-around text-center">
                  <div><div className="h4 mb-0">{saldo.anual}</div><div className="text-secondary small">cupo {saldo.year}</div></div>
                  <div><div className="h4 mb-0">{saldo.disfrutados}</div><div className="text-secondary small">disfrutados</div></div>
                  <div><div className="h4 mb-0 text-warning">{saldo.pendientes}</div><div className="text-secondary small">pendientes</div></div>
                  <div><div className="h4 mb-0 text-success">{saldo.restante}</div><div className="text-secondary small">restantes</div></div>
                </Card.Body>
              </Card>
            )}
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-3">Mis solicitudes ({mias.length})</Card.Title>
                <ListaAusencias ausencias={mias} conNombre={false} />
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {vista === 'aprobaciones' && puedeAprobar && (
        <Card>
          <Card.Body>
            <Card.Title className="h6 mb-3">Pendientes de aprobar ({pendientes.length})</Card.Title>
            {pendientes.length === 0 ? (
              <p className="text-secondary small mb-0">No hay solicitudes pendientes en tu equipo.</p>
            ) : (
              <ul className="list-unstyled mb-0">
                {pendientes.map((a) => (
                  <li key={a.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                    <span>
                      <strong>{a.employeeName}</strong> · {a.typeName} · {a.startDate}→{a.endDate}
                      <span className="text-secondary small"> ({a.dias} día/s){a.reason ? ` · ${a.reason}` : ''}</span>
                    </span>
                    <span className="d-flex gap-2">
                      <Button size="sm" variant="success" onClick={() => decidir(a, true)}>Aprobar</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => decidir(a, false)}>Rechazar</Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card.Body>
        </Card>
      )}

      {vista === 'calendario' && puedeAprobar && (
        <Card>
          <Card.Body>
            <Card.Title className="h6 mb-3">Calendario del equipo · próximos 90 días</Card.Title>
            {calendario.length === 0 ? (
              <p className="text-secondary small mb-0">Nadie de tu equipo tiene ausencias próximas.</p>
            ) : (
              <ListaAusencias ausencias={calendario} conNombre />
            )}
          </Card.Body>
        </Card>
      )}

      {vista === 'tipos' && puedeGestionar && <TiposAusenciaManager tipos={tipos} onChange={reload} />}
    </div>
  );
}

function ListaAusencias({ ausencias, conNombre }: { ausencias: AbsenceDto[]; conNombre: boolean }) {
  if (ausencias.length === 0) return <p className="text-secondary small mb-0">Sin solicitudes.</p>;
  return (
    <ul className="list-unstyled mb-0">
      {ausencias.map((a) => (
        <li key={a.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
          <span>
            {conNombre && <strong>{a.employeeName} · </strong>}
            {a.typeName} · {a.startDate}→{a.endDate}
            <span className="text-secondary small"> ({a.dias} día/s)</span>
          </span>
          <Badge bg={`${VARIANTE[a.status]}-subtle`} text={VARIANTE[a.status]}>{ESTADO_AUSENCIA_LABELS[a.status]}</Badge>
        </li>
      ))}
    </ul>
  );
}
