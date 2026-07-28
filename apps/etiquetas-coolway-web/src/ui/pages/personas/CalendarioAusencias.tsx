import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { ESTADO_AUSENCIA_LABELS, type AbsenceDto, type EstadoAusencia } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';

const VARIANTE: Record<EstadoAusencia, string> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger', CANCELLED: 'secondary' };
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * REQ-008 Fase 3 · Calendario de ausencias del equipo, vista de mes navegable y **filtrable por departamento**.
 * Cada día muestra quién está de ausencia (aprobada o pendiente). Los rechazados no se pintan.
 */
export function CalendarioAusencias({ puedeGestionar = false }: { puedeGestionar?: boolean }) {
  const hoy = new Date();
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth()); // 0-11
  const [aus, setAus] = useState<AbsenceDto[]>([]);
  const [dep, setDep] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    const desde = iso(year, month, 1);
    const finMes = new Date(year, month + 1, 0).getDate();
    const hasta = iso(year, month, finMes);
    rrhhGateway
      .calendarioAusencias(desde, hasta)
      .then((c) => setAus(c.ausencias.filter((a) => a.status !== 'REJECTED')))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => load(), [load]);

  const departamentos = useMemo(() => [...new Set(aus.map((a) => a.department).filter((d): d is string => !!d))].sort(), [aus]);
  const filtradas = useMemo(() => (dep ? aus.filter((a) => a.department === dep) : aus), [aus, dep]);

  // Rejilla del mes: huecos iniciales (lunes=0) + días.
  const primerDia = (new Date(year, month, 1).getDay() + 6) % 7; // getDay: dom=0 → lunes=0
  const diasMes = new Date(year, month + 1, 0).getDate();
  const celdas: (number | null)[] = [...Array(primerDia).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];

  const ausenciasDe = (dia: number) => {
    const d = iso(year, month, dia);
    return filtradas.filter((a) => a.startDate <= d && d <= a.endDate);
  };

  function mover(delta: number) {
    const nuevo = new Date(year, month + delta, 1);
    setYear(nuevo.getFullYear());
    setMonth(nuevo.getMonth());
  }

  async function cancelar(a: AbsenceDto) {
    if (!puedeGestionar) return;
    if (!confirm(`¿Cancelar la ausencia de ${a.employeeName} (${a.typeName}, ${a.startDate}→${a.endDate})?`)) return;
    try {
      await rrhhGateway.anularAusencia(a.id);
      load();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card>
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => mover(-1)}><ChevronLeft /></Button>
            <span className="fw-semibold text-capitalize" style={{ minWidth: 150, textAlign: 'center' }}>{MESES[month]} {year}</span>
            <Button size="sm" variant="outline-secondary" onClick={() => mover(1)}><ChevronRight /></Button>
          </div>
          <Form.Select size="sm" style={{ maxWidth: 220 }} value={dep} onChange={(e) => setDep(e.target.value)}>
            <option value="">Todos los departamentos</option>
            {departamentos.map((d) => (<option key={d} value={d}>{d}</option>))}
          </Form.Select>
        </div>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

        {loading ? (
          <Spinner animation="border" size="sm" />
        ) : (
          <div className="cal-grid">
            {DIAS.map((d) => (<div key={d} className="cal-head">{d}</div>))}
            {celdas.map((dia, i) => (
              <div key={i} className={`cal-cell ${dia == null ? 'cal-empty' : ''}`}>
                {dia != null && (
                  <>
                    <div className="cal-num">{dia}</div>
                    {ausenciasDe(dia).map((a) => (
                      <Badge
                        key={a.id}
                        bg={`${VARIANTE[a.status]}-subtle`}
                        text={VARIANTE[a.status]}
                        className="cal-chip"
                        role={puedeGestionar ? 'button' : undefined}
                        style={puedeGestionar ? { cursor: 'pointer' } : undefined}
                        onClick={puedeGestionar ? () => cancelar(a) : undefined}
                        title={`${a.employeeName} · ${a.typeName} · ${ESTADO_AUSENCIA_LABELS[a.status]}${puedeGestionar ? ' · (clic para cancelar)' : ''}`}
                      >
                        {a.employeeName.split(' ')[0]}
                      </Badge>
                    ))}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
