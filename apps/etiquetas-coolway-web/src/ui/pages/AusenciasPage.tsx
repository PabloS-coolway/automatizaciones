import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, ButtonGroup, Card, Form, Nav, Spinner } from 'react-bootstrap';
import { Paperclip } from 'react-bootstrap-icons';
import {
  ESTADO_AUSENCIA_LABELS,
  MITAD_DIA_LABELS,
  type AbsenceDto,
  type AbsenceTypeDto,
  type EstadoAusencia,
  type MitadDia,
  type SaldoVacacionesDto,
} from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { useRrhh } from '../rrhh/RrhhContext';
import { TiposAusenciaManager } from './personas/TiposAusenciaManager';
import { CalendarioAusencias } from './personas/CalendarioAusencias';
import { MiCalendarioAnual } from './personas/MiCalendarioAnual';
import { diasSolicitados as calcDias, esUnSoloDia } from '../../domain/ausencia-dias';

const VARIANTE: Record<EstadoAusencia, string> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', CANCELLED: 'secondary' };
type Vista = 'mias' | 'calendario' | 'aprobaciones' | 'tipos';
type CalModo = 'mio' | 'equipo';

/**
 * REQ-008 Fase 3 · Ausencias. El empleado solicita y ve sus solicitudes; el responsable/RRHH aprueba las de su
 * equipo; RRHH administra el catálogo de tipos.
 */
export function AusenciasPage() {
  const { employee, loading: rrhhLoading } = useRrhh();
  const puedeAprobar = employee != null && employee.rrhhRole !== 'EMPLEADO';
  const puedeGestionar = employee?.rrhhRole === 'RRHH' || employee?.rrhhRole === 'ADMIN';

  const [vista, setVista] = useState<Vista>('mias');
  const [calModo, setCalModo] = useState<CalModo>('mio');
  const [soloActivas, setSoloActivas] = useState(true);
  const [mias, setMias] = useState<AbsenceDto[]>([]);
  const [pendientes, setPendientes] = useState<AbsenceDto[]>([]);
  const [tipos, setTipos] = useState<AbsenceTypeDto[]>([]);
  const [saldo, setSaldo] = useState<SaldoVacacionesDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({ typeId: '', startDate: '', endDate: '', halfDay: false, halfDayPart: 'FIRST' as MitadDia, reason: '' });
  const [justificante, setJustificante] = useState<File | null>(null);
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

  const tiposActivos = useMemo(() => tipos.filter((t) => t.active), [tipos]);
  const tipoSel = useMemo(() => tiposActivos.find((t) => String(t.id) === form.typeId) ?? null, [tiposActivos, form.typeId]);
  const unSoloDia = esUnSoloDia(form.startDate, form.endDate);
  const diasResumen = calcDias(form.startDate, form.endDate, form.halfDay && unSoloDia);
  // Filtro de "Mis solicitudes": por defecto sólo las activas (pendientes/aprobadas); "Todas" añade
  // canceladas y rechazadas. Así la lista útil no se ensucia con el histórico cancelado.
  const esActiva = (a: AbsenceDto) => a.status === 'PENDING' || a.status === 'APPROVED';
  const miasFiltradas = useMemo(() => (soloActivas ? mias.filter(esActiva) : mias), [mias, soloActivas]);
  const canceladasOcultas = useMemo(() => mias.filter((a) => !esActiva(a)).length, [mias]);

  async function solicitar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const esMedio = form.halfDay && esUnSoloDia(form.startDate, form.endDate);
      const creada = await rrhhGateway.solicitarAusencia({
        typeId: Number(form.typeId),
        startDate: form.startDate,
        endDate: form.endDate,
        halfDay: esMedio,
        halfDayPart: esMedio ? form.halfDayPart : undefined,
        reason: form.reason || undefined,
      });
      if (justificante) await rrhhGateway.subirJustificante(creada.id, justificante);
      setNotice('Solicitud enviada.');
      setForm({ typeId: '', startDate: '', endDate: '', halfDay: false, halfDayPart: 'FIRST', reason: '' });
      setJustificante(null);
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function cancelar(a: AbsenceDto) {
    if (!confirm(`¿Cancelar la ausencia de ${a.typeName} (${a.startDate}→${a.endDate})?`)) return;
    setError('');
    setNotice('');
    try {
      await rrhhGateway.anularAusencia(a.id);
      setNotice('Ausencia cancelada.');
      reload();
    } catch (err) {
      setError((err as Error).message);
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
        <Nav.Item><Nav.Link eventKey="calendario">Calendario</Nav.Link></Nav.Item>
        {puedeAprobar && (
          <Nav.Item><Nav.Link eventKey="aprobaciones">Aprobaciones {pendientes.length > 0 && <Badge bg="warning" text="dark">{pendientes.length}</Badge>}</Nav.Link></Nav.Item>
        )}
        {puedeGestionar && <Nav.Item><Nav.Link eventKey="tipos">Tipos</Nav.Link></Nav.Item>}
      </Nav>

      {vista === 'mias' && (
        <div className="row g-4">
          <div className="col-12 col-lg-5">
            <Card>
              <Card.Body>
                <Card.Title className="h6 mb-1">Solicitar ausencia</Card.Title>
                <p className="text-secondary small mb-3">Las vacaciones se cuentan en <strong>días naturales</strong> (incluyen fines de semana y festivos). El cupo habitual es de <strong>30 días naturales al año</strong>.</p>
                <Form onSubmit={solicitar}>
                  <Form.Group className="mb-2">
                    <Form.Label className="small">Tipo</Form.Label>
                    <Form.Select value={form.typeId} required onChange={(e) => setForm({ ...form, typeId: e.target.value })}>
                      <option value="">— Elegir —</option>
                      {tiposActivos.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}{t.requiresApproval ? '' : ' (sin aprobación)'}</option>
                      ))}
                    </Form.Select>
                    {tipoSel && <ReglasTipo tipo={tipoSel} />}
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
                  <Form.Check
                    className="mb-2"
                    type="checkbox"
                    id="medio-dia"
                    label="Medio día"
                    checked={form.halfDay && unSoloDia}
                    disabled={!unSoloDia}
                    onChange={(e) => setForm({ ...form, halfDay: e.target.checked })}
                  />
                  {!unSoloDia && form.startDate && <div className="text-secondary small mb-2">El medio día sólo aplica a un único día.</div>}
                  {form.halfDay && unSoloDia && (
                    <Form.Group className="mb-2">
                      <Form.Label className="small">¿Qué mitad?</Form.Label>
                      <Form.Select value={form.halfDayPart} onChange={(e) => setForm({ ...form, halfDayPart: e.target.value as MitadDia })}>
                        <option value="FIRST">{MITAD_DIA_LABELS.FIRST}</option>
                        <option value="SECOND">{MITAD_DIA_LABELS.SECOND}</option>
                      </Form.Select>
                    </Form.Group>
                  )}
                  <Form.Group className="mb-3">
                    <Form.Label className="small">Motivo (opcional)</Form.Label>
                    <Form.Control as="textarea" rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label className="small">Justificante (opcional · PDF/JPG/PNG)</Form.Label>
                    <Form.Control type="file" accept="application/pdf,image/jpeg,image/png" onChange={(e) => setJustificante((e.target as HTMLInputElement).files?.[0] ?? null)} />
                  </Form.Group>
                  {tipoSel && diasResumen != null && (
                    <div className="resumen-ausencia mb-3">
                      <div className="text-secondary small mb-1">Resumen</div>
                      <div className="d-flex justify-content-between align-items-center">
                        <span>
                          <strong>{tipoSel.name}</strong>
                          {form.halfDay && unSoloDia ? ` · ${MITAD_DIA_LABELS[form.halfDayPart]}` : ''}
                        </span>
                        <Badge bg="light" text="dark" className="border">{diasResumen} día{diasResumen === 1 ? '' : 's'}</Badge>
                      </div>
                      <div className="text-secondary small mt-1">
                        {form.startDate === form.endDate ? form.startDate : `${form.startDate} → ${form.endDate}`}
                        {tipoSel.computesBalance ? ' · descuenta de tu saldo' : ' · no descuenta saldo'}
                      </div>
                    </div>
                  )}
                  <Button type="submit" className="btn-brand w-100" disabled={saving}>
                    {saving ? <Spinner as="span" size="sm" animation="border" /> : 'Enviar solicitud'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </div>
          <div className="col-12 col-lg-7">
            {saldo && saldo.anual > 0 && <SaldoCard saldo={saldo} />}
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <Card.Title className="h6 mb-0">Mis solicitudes ({miasFiltradas.length})</Card.Title>
                  <ButtonGroup size="sm">
                    <Button variant={soloActivas ? 'brand' : 'outline-secondary'} onClick={() => setSoloActivas(true)}>Activas</Button>
                    <Button variant={!soloActivas ? 'brand' : 'outline-secondary'} onClick={() => setSoloActivas(false)}>Todas</Button>
                  </ButtonGroup>
                </div>
                <ListaAusencias ausencias={miasFiltradas} conNombre={false} onCancelar={cancelar} puedeGestionar={puedeGestionar} />
                {soloActivas && canceladasOcultas > 0 && (
                  <p className="text-secondary small mb-0 mt-2">{canceladasOcultas} solicitud(es) cancelada/rechazada oculta/s. <Button variant="link" size="sm" className="p-0 align-baseline" onClick={() => setSoloActivas(false)}>Ver todas</Button></p>
                )}
              </Card.Body>
            </Card>
          </div>
        </div>
      )}

      {vista === 'calendario' && (
        <>
          {puedeAprobar && (
            <ButtonGroup className="mb-3">
              <Button variant={calModo === 'mio' ? 'brand' : 'outline-secondary'} onClick={() => setCalModo('mio')}>Mi año</Button>
              <Button variant={calModo === 'equipo' ? 'brand' : 'outline-secondary'} onClick={() => setCalModo('equipo')}>Equipo</Button>
            </ButtonGroup>
          )}
          {puedeAprobar && calModo === 'equipo'
            ? <CalendarioAusencias puedeGestionar={puedeGestionar} />
            : <MiCalendarioAnual ausencias={mias} />}
        </>
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
                      <span className="text-secondary small"> ({duracionLabel(a)}){a.reason ? ` · ${a.reason}` : ''}</span>
                      {a.attachmentName && (
                        <Button variant="link" size="sm" className="p-0 ms-2 align-baseline" onClick={() => rrhhGateway.descargarJustificante(a.id, a.attachmentName!)}>
                          <Paperclip /> justificante
                        </Button>
                      )}
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

      {vista === 'tipos' && puedeGestionar && <TiposAusenciaManager tipos={tipos} onChange={reload} />}
    </div>
  );
}

/**
 * #6 (MAQUETA) · Saldo estilo Factorial: Devengado / Disponible / Disfrutado. **Disponible** y **Disfrutado**
 * son reales (del backend); **Devengado** es una ESTIMACIÓN provisional (prorrateo lineal del cupo por lo que
 * va de año) — se marca como borrador porque la política real de devengo aún no está configurada. No es un
 * número en el que basar decisiones: el cálculo definitivo queda pendiente.
 */
function SaldoCard({ saldo }: { saldo: SaldoVacacionesDto }) {
  // Prorrateo lineal transparente: cupo anual × (días transcurridos del año / días del año).
  const hoy = new Date();
  const inicioAnio = new Date(saldo.year, 0, 1);
  const finAnio = new Date(saldo.year + 1, 0, 1);
  const fraccion = Math.min(1, Math.max(0, (hoy.getTime() - inicioAnio.getTime()) / (finAnio.getTime() - inicioAnio.getTime())));
  const devengadoEstimado = Math.round(saldo.anual * fraccion * 10) / 10;
  return (
    <Card className="mb-3">
      <Card.Body>
        <div className="d-flex justify-content-around text-center">
          <div>
            <div className="h4 mb-0 text-secondary">{devengadoEstimado}</div>
            <div className="text-secondary small">Devengado <Badge bg="warning-subtle" text="dark" className="border">borrador</Badge></div>
          </div>
          <div>
            <div className="h4 mb-0 text-success">{saldo.restante}</div>
            <div className="text-secondary small">Disponible</div>
          </div>
          <div>
            <div className="h4 mb-0">{saldo.disfrutados}</div>
            <div className="text-secondary small">Disfrutado</div>
          </div>
        </div>
        <div className="text-secondary small mt-2 pt-2 border-top">
          Cupo {saldo.year}: <strong>{saldo.anual}</strong> días · pendientes de aprobar: <strong>{saldo.pendientes}</strong>.
          <br />
          <em>Devengado es una estimación provisional (prorrateo por lo que va de año); el cálculo real está pendiente de configurar.</em>
        </div>
      </Card.Body>
    </Card>
  );
}

/** #2 · Reglas del tipo elegido, para que el empleado sepa qué implica antes de solicitar (estilo Factorial). */
function ReglasTipo({ tipo }: { tipo: AbsenceTypeDto }) {
  const reglas: { txt: string; bg: string }[] = [
    tipo.requiresApproval ? { txt: 'Requiere aprobación', bg: 'warning-subtle' } : { txt: 'Sin aprobación (automática)', bg: 'success-subtle' },
    tipo.computesBalance ? { txt: 'Descuenta saldo', bg: 'secondary-subtle' } : { txt: 'No descuenta saldo', bg: 'secondary-subtle' },
    ...(tipo.requiresAttachment ? [{ txt: 'Justificante obligatorio', bg: 'danger-subtle' }] : []),
  ];
  return (
    <div className="d-flex flex-wrap gap-1 mt-2">
      {reglas.map((r) => (
        <Badge key={r.txt} bg={r.bg} text="dark" className="fw-normal border">{r.txt}</Badge>
      ))}
    </div>
  );
}

/** Etiqueta de duración de una ausencia: "medio día (2ª mitad)" o "N día/s". */
function duracionLabel(a: AbsenceDto): string {
  if (a.halfDay) return `medio día${a.halfDayPart ? ` (${a.halfDayPart === 'FIRST' ? '1ª mitad' : '2ª mitad'})` : ''}`;
  return `${a.dias} día${a.dias === 1 ? '' : 's'}`;
}

function ListaAusencias({ ausencias, conNombre, onCancelar, puedeGestionar }: { ausencias: AbsenceDto[]; conNombre: boolean; onCancelar?: (a: AbsenceDto) => void; puedeGestionar?: boolean }) {
  if (ausencias.length === 0) return <p className="text-secondary small mb-0">Sin solicitudes.</p>;
  // Se puede cancelar una PENDIENTE (el dueño) o una APROBADA sólo si gestiona (admin/RRHH).
  const cancelable = (a: AbsenceDto) => a.status === 'PENDING' || (a.status === 'APPROVED' && !!puedeGestionar);
  return (
    <ul className="list-unstyled mb-0">
      {ausencias.map((a) => (
        <li key={a.id} className="d-flex justify-content-between align-items-center py-2 border-bottom">
          <span>
            {conNombre && <strong>{a.employeeName} · </strong>}
            {a.typeName} · {a.startDate}→{a.endDate}
            <span className="text-secondary small"> ({duracionLabel(a)})</span>
            {a.attachmentName && (
              <Button variant="link" size="sm" className="p-0 ms-2 align-baseline" onClick={() => rrhhGateway.descargarJustificante(a.id, a.attachmentName!)}>
                <Paperclip /> justificante
              </Button>
            )}
          </span>
          <span className="d-flex align-items-center gap-2">
            <Badge bg={`${VARIANTE[a.status]}-subtle`} text={VARIANTE[a.status]}>{ESTADO_AUSENCIA_LABELS[a.status]}</Badge>
            {onCancelar && cancelable(a) && (
              <Button size="sm" variant="outline-danger" onClick={() => onCancelar(a)}>Cancelar</Button>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
