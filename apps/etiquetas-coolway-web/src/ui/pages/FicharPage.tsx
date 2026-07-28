import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { BoxArrowInRight, BoxArrowRight, CupHot, Download, GeoAlt, PlayFill } from 'react-bootstrap-icons';
import {
  ESTADO_JORNADA_LABELS,
  MARCAJE_LABELS,
  type HistoricoFichajeDto,
  type JornadaHoyDto,
  type Marcaje,
} from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { useRrhh } from '../rrhh/RrhhContext';
import { formatearMinutos, historicoACsv } from '../../domain/fichaje-csv';

const VARIANTE: Record<Marcaje, string> = { IN: 'success', OUT: 'danger', BREAK_START: 'warning', BREAK_END: 'primary' };
const ICONO: Record<Marcaje, JSX.Element> = {
  IN: <BoxArrowInRight />,
  OUT: <BoxArrowRight />,
  BREAK_START: <CupHot />,
  BREAK_END: <PlayFill />,
};
const VARIANTE_ESTADO: Record<string, string> = { FUERA: 'secondary', TRABAJANDO: 'success', EN_PAUSA: 'warning' };

/** Hora local HH:MM de un ISO. */
function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** "lun 28" a partir de 'YYYY-MM-DD'. */
function diaLabel(fecha: string): string {
  const d = new Date(`${fecha}T00:00:00`);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
}

/** Agrupa los días del histórico por mes (conserva el orden, más reciente primero) con sus subtotales. */
function agruparPorMes(dias: { fecha: string; minutosTrabajados: number; minutosExtra: number }[]) {
  const grupos: { ym: string; label: string; dias: typeof dias; totalMin: number; totalExtra: number }[] = [];
  for (const d of dias) {
    const ym = d.fecha.slice(0, 7);
    let g = grupos.find((x) => x.ym === ym);
    if (!g) {
      const label = new Date(`${ym}-01T00:00:00`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      g = { ym, label, dias: [], totalMin: 0, totalExtra: 0 };
      grupos.push(g);
    }
    g.dias.push(d);
    g.totalMin += d.minutosTrabajados;
    g.totalExtra += d.minutosExtra;
  }
  return grupos;
}

/** Desde móvil (puntero grueso) marcamos el origen como MOBILE; si no, WEB. Es sólo informativo. */
function origen(): 'WEB' | 'MOBILE' {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'MOBILE' : 'WEB';
}

/** Pide la ubicación al navegador (con permiso). Si la deniega, no está disponible o tarda, devuelve undefined
 * y se ficha igual sin coordenadas. Nunca bloquea el fichaje. */
function obtenerUbicacion(): Promise<{ latitude: number; longitude: number; accuracy: number } | undefined> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(undefined),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}

/**
 * REQ-008 Fase 2 (Slice 1) · Fichar jornada. Pensada para el **móvil**: pocos botones, grandes. La hora la pone
 * el servidor; aquí sólo se dice qué se marca. El estado y los botones posibles salen de la propia jornada.
 */
export function FicharPage() {
  const { employee, loading: rrhhLoading } = useRrhh();
  const [jornada, setJornada] = useState<JornadaHoyDto | null>(null);
  const [historico, setHistorico] = useState<HistoricoFichajeDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marcando, setMarcando] = useState<Marcaje | null>(null);

  const cargarHistorico = useCallback(() => {
    rrhhGateway.miHistorico().then(setHistorico).catch(() => setHistorico(null));
  }, []);

  const load = useCallback(() => {
    if (!employee) {
      setLoading(false);
      return;
    }
    setLoading(true);
    rrhhGateway
      .jornadaHoy()
      .then(setJornada)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    cargarHistorico();
  }, [employee, cargarHistorico]);

  useEffect(() => load(), [load]);

  async function fichar(kind: Marcaje) {
    setError('');
    setMarcando(kind);
    try {
      const geo = await obtenerUbicacion(); // pide permiso; si lo deniega, ficha igual sin coords
      setJornada(await rrhhGateway.fichar({ kind, source: origen(), ...geo }));
      cargarHistorico(); // el fichaje puede cerrar el día → refresca el historial
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMarcando(null);
    }
  }

  function descargarCsv() {
    if (!historico) return;
    const blob = new Blob([historicoACsv(historico.dias)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fichajes_${historico.desde}_${historico.hasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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
          Aún no tienes <strong>ficha de empleado</strong>: no puedes fichar hasta que RRHH te dé de alta.
        </Alert>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 520 }}>
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Fichar</h1>
        <p className="text-secondary mb-0">Tu jornada de hoy. La hora la registra el servidor.</p>
        <p className="text-secondary small mb-0"><GeoAlt className="me-1" />Al fichar se guarda tu ubicación (si la autorizas). Si no das permiso, se ficha igual sin ella.</p>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

      {jornada && (
        <>
          <Card className="mb-3 text-center">
            <Card.Body className="p-4">
              <Badge bg={`${VARIANTE_ESTADO[jornada.estado]}-subtle`} text={VARIANTE_ESTADO[jornada.estado]} className="mb-2">
                {ESTADO_JORNADA_LABELS[jornada.estado]}
              </Badge>
              <div className="display-6">{formatearMinutos(jornada.minutosTrabajados)}</div>
              <div className="text-secondary small">trabajados hoy</div>
            </Card.Body>
          </Card>

          <div className="d-grid gap-2 mb-4">
            {jornada.posibles.map((m) => (
              <Button
                key={m}
                variant={VARIANTE[m]}
                size="lg"
                className="py-3"
                onClick={() => fichar(m)}
                disabled={marcando !== null}
              >
                {marcando === m ? <Spinner as="span" size="sm" animation="border" /> : <>{ICONO[m]} <span className="ms-2">{MARCAJE_LABELS[m]}</span></>}
              </Button>
            ))}
            {jornada.posibles.length === 0 && <p className="text-secondary text-center">Jornada cerrada por hoy.</p>}
          </div>

          <Card className="mb-3">
            <Card.Body>
              <Card.Title className="h6 mb-3">Marcajes de hoy</Card.Title>
              {jornada.fichajes.length === 0 ? (
                <p className="text-secondary small mb-0">Aún no has fichado hoy.</p>
              ) : (
                <ul className="list-unstyled mb-0">
                  {jornada.fichajes.map((e) => (
                    <li key={e.id} className="d-flex justify-content-between py-1 border-bottom">
                      <span>{MARCAJE_LABELS[e.kind]}</span>
                      <span className="text-secondary">{hora(e.at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>

          {historico && historico.dias.length > 0 && (
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Card.Title className="h6 mb-0">Mi historial</Card.Title>
                  <Button size="sm" variant="outline-secondary" onClick={descargarCsv}>
                    <Download className="me-1" /> CSV
                  </Button>
                </div>
                {agruparPorMes(historico.dias).map((mes) => (
                  <div key={mes.ym} className="mb-3">
                    <div className="d-flex justify-content-between align-items-baseline mb-1">
                      <div className="fw-semibold text-capitalize">{mes.label}</div>
                      <div className="small text-secondary">{formatearMinutos(mes.totalMin)}{mes.totalExtra > 0 && ` · +${formatearMinutos(mes.totalExtra)} extra`}</div>
                    </div>
                    <ul className="list-unstyled mb-0">
                      {mes.dias.map((d) => (
                        <li key={d.fecha} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                          <span className="text-capitalize">{diaLabel(d.fecha)}</span>
                          <span className="d-flex align-items-center gap-2">
                            {d.minutosExtra > 0 && (
                              <Badge bg="warning-subtle" text="warning">+{formatearMinutos(d.minutosExtra)} extra</Badge>
                            )}
                            <span className="text-secondary">{formatearMinutos(d.minutosTrabajados)}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {historico.dias.length > 0 && (
                  <p className="text-secondary small mb-0 pt-1 border-top">
                    Total del periodo: <strong>{formatearMinutos(historico.totalMinutos)}</strong>
                    {historico.totalExtra > 0 && <> · horas extra: <strong>{formatearMinutos(historico.totalExtra)}</strong></>}
                  </p>
                )}
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
