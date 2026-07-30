import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Modal, Spinner } from 'react-bootstrap';
import { BoxArrowInRight, BoxArrowRight, CupHot, GeoAlt, GeoAltFill, PlayFill } from 'react-bootstrap-icons';
import { ESTADO_JORNADA_LABELS, MARCAJE_LABELS, type JornadaHoyDto, type Marcaje } from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { useRrhh } from '../rrhh/RrhhContext';
import { formatearMinutos } from '../../domain/fichaje-csv';
import { MiMesFichajes } from './personas/MiMesFichajes';

const ICONO: Record<Marcaje, JSX.Element> = {
  IN: <BoxArrowInRight />,
  OUT: <BoxArrowRight />,
  BREAK_START: <CupHot />,
  BREAK_END: <PlayFill />,
};
// Estilo de cada botón: entrada/salida sólidos (acción principal), pausas en contorno (secundarias).
const BOTON: Record<Marcaje, string> = { IN: 'success', OUT: 'danger', BREAK_START: 'outline-warning', BREAK_END: 'outline-primary' };
const CLASE_PUNTO: Record<string, string> = { FUERA: '', TRABAJANDO: 'trabajando', EN_PAUSA: 'pausa' };
// Si al salir el tiempo trabajado supera la jornada teórica en más de 8 h, huele a fichaje olvidado.
const MARGEN_ANOMALO_MIN = 8 * 60;

type Ubicacion = { latitude: number; longitude: number; accuracy: number };
type GeoEstado = 'idle' | 'cargando' | 'ok' | 'no';

/** Hora local HH:MM de un ISO. */
function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

/** Desde móvil (puntero grueso) marcamos el origen como MOBILE; si no, WEB. Es sólo informativo. */
function origen(): 'WEB' | 'MOBILE' {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'MOBILE' : 'WEB';
}

/** Pide la ubicación al navegador (con permiso). Si la deniega, no está disponible o tarda, devuelve undefined
 * y se ficha igual sin coordenadas. Nunca bloquea el fichaje. */
function obtenerUbicacion(): Promise<Ubicacion | undefined> {
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
 * REQ-008 Fase 2 · Fichar jornada. Pensada para el **móvil**: pocos botones, grandes, look limpio. La hora la
 * pone el servidor; aquí sólo se dice qué se marca. Expone la **ubicación** que se está capturando y, si un día
 * quedó abierto (tiempo anómalo), ofrece cerrarlo con la **jornada teórica**.
 */
export function FicharPage() {
  const { employee, loading: rrhhLoading } = useRrhh();
  const [jornada, setJornada] = useState<JornadaHoyDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [marcando, setMarcando] = useState<Marcaje | null>(null);
  const [geo, setGeo] = useState<Ubicacion | null>(null);
  const [geoEstado, setGeoEstado] = useState<GeoEstado>('idle');
  const [confirmarSalir, setConfirmarSalir] = useState(false);

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
  }, [employee]);

  useEffect(() => load(), [load]);

  // Ubicación en vivo: se pide al entrar (con permiso) y se muestra, para que se vea que se está capturando.
  useEffect(() => {
    if (!employee) return;
    setGeoEstado('cargando');
    obtenerUbicacion().then((u) => {
      setGeo(u ?? null);
      setGeoEstado(u ? 'ok' : 'no');
    });
  }, [employee]);

  async function fichar(kind: Marcaje) {
    setError('');
    setMarcando(kind);
    try {
      setGeoEstado('cargando');
      const u = await obtenerUbicacion(); // refresca la ubicación en el momento del fichaje
      setGeo(u ?? null);
      setGeoEstado(u ? 'ok' : 'no');
      setJornada(await rrhhGateway.fichar({ kind, source: origen(), ...u }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMarcando(null);
    }
  }

  // Al salir: si el tiempo es anómalo (jornada olvidada), pregunta antes en vez de registrar 20 h.
  function pulsarSalir() {
    if (jornada && jornada.estado === 'TRABAJANDO' && jornada.minutosTrabajados >= jornada.jornadaTeoricaMin + MARGEN_ANOMALO_MIN) {
      setConfirmarSalir(true);
    } else {
      fichar('OUT');
    }
  }

  async function cerrarConJornada() {
    setConfirmarSalir(false);
    setError('');
    setMarcando('OUT');
    try {
      setJornada(await rrhhGateway.cerrarConJornada());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setMarcando(null);
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
          Aún no tienes <strong>ficha de empleado</strong>: no puedes fichar hasta que RRHH te dé de alta.
        </Alert>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: 480 }}>
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Fichar</h1>
        <p className="text-secondary mb-0">Tu jornada de hoy. La hora la registra el servidor.</p>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

      {jornada && (
        <>
          {/* Hero: estado + tiempo en grande, limpio */}
          <Card className="fichar-hero mb-3">
            <Card.Body className="text-center py-4">
              <div className="d-inline-flex align-items-center gap-2 mb-2">
                <span className={`estado-punto ${CLASE_PUNTO[jornada.estado]}`} />
                <span className="text-secondary fw-semibold">{ESTADO_JORNADA_LABELS[jornada.estado]}</span>
              </div>
              <div className="fichar-time">{formatearMinutos(jornada.minutosTrabajados)}</div>
              <div className="text-secondary small">trabajados hoy</div>
            </Card.Body>
          </Card>

          {/* Ubicación en vivo */}
          <div className="fichar-geo mb-3">
            {geoEstado === 'cargando' && (<><Spinner as="span" size="sm" animation="border" className="me-2" /> Obteniendo tu ubicación…</>)}
            {geoEstado === 'ok' && geo && (
              <>
                <GeoAltFill className="text-success me-2" />
                Ubicación lista <span className="text-secondary">· ±{Math.round(geo.accuracy)} m</span>
                <a className="ms-2" href={`https://www.google.com/maps?q=${geo.latitude},${geo.longitude}`} target="_blank" rel="noreferrer">ver en mapa</a>
              </>
            )}
            {geoEstado === 'no' && (<><GeoAlt className="text-secondary me-2" />Sin ubicación (se fichará igual, sin ella)</>)}
            {geoEstado === 'idle' && (<><GeoAlt className="text-secondary me-2" />La ubicación se guarda al fichar si la autorizas</>)}
          </div>

          {/* Acciones */}
          <div className="d-grid gap-2 mb-4">
            {jornada.posibles.map((m) => (
              <Button
                key={m}
                variant={BOTON[m]}
                size="lg"
                className="fichar-btn"
                onClick={() => (m === 'OUT' ? pulsarSalir() : fichar(m))}
                disabled={marcando !== null}
              >
                {marcando === m ? <Spinner as="span" size="sm" animation="border" /> : <>{ICONO[m]} <span className="ms-2">{MARCAJE_LABELS[m]}</span></>}
              </Button>
            ))}
            {jornada.posibles.length === 0 && <p className="text-secondary text-center mb-0">Jornada cerrada por hoy. ¡Hasta mañana!</p>}
          </div>

          {/* Marcajes de hoy */}
          {jornada.fichajes.length > 0 && (
            <Card className="mb-3">
              <Card.Body>
                <Card.Title className="h6 mb-3">Marcajes de hoy</Card.Title>
                <ul className="list-unstyled mb-0">
                  {jornada.fichajes.map((e) => (
                    <li key={e.id} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                      <span className="d-inline-flex align-items-center gap-2">{ICONO[e.kind]} {MARCAJE_LABELS[e.kind]}</span>
                      <span className="text-secondary">{hora(e.at)}</span>
                    </li>
                  ))}
                </ul>
              </Card.Body>
            </Card>
          )}

          {/* Mi jornada por mes (navegable, con faltantes y auto-edición) */}
          <MiMesFichajes />
        </>
      )}

      {/* Cierre de jornada olvidada */}
      <Modal show={confirmarSalir} onHide={() => setConfirmarSalir(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h6">¿Te dejaste el fichaje abierto?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            Llevas <strong>{jornada && formatearMinutos(jornada.minutosTrabajados)}</strong> trabajados, más de lo habitual.
            Si olvidaste salir otro día, puedes cerrar con tu jornada teórica en vez de registrar todo ese tiempo.
          </p>
          <p className="text-secondary small mb-0">Tu jornada teórica es {jornada && formatearMinutos(jornada.jornadaTeoricaMin)}.</p>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column align-items-stretch gap-2">
          <Button variant="brand" className="btn-brand" onClick={cerrarConJornada} disabled={marcando !== null}>
            Cerrar con mi jornada ({jornada && formatearMinutos(jornada.jornadaTeoricaMin)})
          </Button>
          <Button variant="outline-secondary" onClick={() => { setConfirmarSalir(false); fichar('OUT'); }} disabled={marcando !== null}>
            Registrar el tiempo real ({jornada && formatearMinutos(jornada.minutosTrabajados)})
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
