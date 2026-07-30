import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Card, Spinner } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, ExclamationTriangleFill, PencilSquare, PlusLg } from 'react-bootstrap-icons';
import { ESTADO_DIA_LABELS, type DiaResumenDto, type EstadoDia, type ResumenMesDto } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';
import { formatearMinutos } from '../../../domain/fichaje-csv';
import { MiDiaModal } from './MiDiaModal';

// Estilo por estado del día: color del badge y si la fila se resalta.
const ESTILO: Record<EstadoDia, { bg: string; text: string; fila?: string }> = {
  OK: { bg: 'success-subtle', text: 'success' },
  INCOMPLETO: { bg: 'warning-subtle', text: 'warning', fila: 'mm-warn' },
  FALTA: { bg: 'danger-subtle', text: 'danger', fila: 'mm-falta' },
  FESTIVO: { bg: 'info-subtle', text: 'info' },
  FIN_SEMANA: { bg: 'secondary-subtle', text: 'secondary' },
  AUSENCIA: { bg: 'info-subtle', text: 'info' },
  HOY: { bg: 'primary-subtle', text: 'primary' },
  FUTURO: { bg: 'light', text: 'secondary' },
};

const pad = (n: number) => String(n).padStart(2, '0');
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const diaLabel = (fecha: string) => new Date(`${fecha}T00:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });

/**
 * REQ-008 · "Mi jornada" por MES: navegable (un mes cada vez, así escala a años) y marcando los días laborables
 * en los que **falta fichar**. El empleado puede corregir sus propios marcajes de los días recientes.
 */
export function MiMesFichajes() {
  const hoy = new Date();
  const hoyISO = isoLocal(hoy);
  const [year, setYear] = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth() + 1); // 1-12
  const [data, setData] = useState<ResumenMesDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editar, setEditar] = useState<{ fecha: string; editable: boolean } | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    rrhhGateway.resumenMes(year, month).then(setData).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => cargar(), [cargar]);

  function mover(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const limiteEdicion = useMemo(() => {
    const l = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (data?.diasAutoedicion ?? 14));
    return isoLocal(l);
  }, [data, hoy]);
  const esEditable = (d: DiaResumenDto) => d.estado !== 'FUTURO' && d.fecha >= limiteEdicion && d.fecha <= hoyISO;

  const visibles = (data?.dias ?? []).filter((d) => d.estado !== 'FUTURO');
  const mesLabel = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  function descargarCsv() {
    if (!data) return;
    const filas = [['fecha', 'estado', 'minutos', 'extra'], ...visibles.map((d) => [d.fecha, d.estado, String(d.minutosTrabajados), String(d.minutosExtra)])];
    const blob = new Blob([filas.map((f) => f.join(';')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jornada_${year}-${pad(month)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => mover(-1)}><ChevronLeft /></Button>
            <span className="fw-semibold text-capitalize" style={{ minWidth: 140, textAlign: 'center' }}>{mesLabel}</span>
            <Button size="sm" variant="outline-secondary" onClick={() => mover(1)}><ChevronRight /></Button>
          </div>
          {data && <Button size="sm" variant="outline-secondary" onClick={descargarCsv}>CSV</Button>}
        </div>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

        {loading ? (
          <Spinner animation="border" size="sm" />
        ) : data ? (
          <>
            <div className="d-flex flex-wrap gap-3 mb-3 text-secondary small">
              <span>Trabajado: <strong>{formatearMinutos(data.totalMinutos)}</strong></span>
              {data.totalExtra > 0 && <span>Extra: <strong>{formatearMinutos(data.totalExtra)}</strong></span>}
              {data.faltan > 0 && (
                <span className="text-danger"><ExclamationTriangleFill className="me-1" /><strong>{data.faltan}</strong> día(s) sin fichar</span>
              )}
            </div>

            <ul className="list-unstyled mb-0">
              {visibles.map((d) => {
                const st = ESTILO[d.estado];
                const editable = esEditable(d);
                return (
                  <li key={d.fecha} className={`mm-dia ${st.fila ?? ''}`}>
                    <span className="text-capitalize mm-fecha">{diaLabel(d.fecha)}</span>
                    <span className="mm-centro">
                      <Badge bg={st.bg} text={st.text}>{ESTADO_DIA_LABELS[d.estado] || d.estado}</Badge>
                      {d.etiqueta && <span className="text-secondary small ms-2">{d.etiqueta}</span>}
                    </span>
                    <span className="mm-derecha">
                      {d.minutosExtra > 0 && <Badge bg="warning-subtle" text="warning">+{formatearMinutos(d.minutosExtra)}</Badge>}
                      {d.minutosTrabajados > 0 && <span className="mm-horas">{formatearMinutos(d.minutosTrabajados)}</span>}
                      {editable && (
                        <Button size="sm" variant={d.estado === 'FALTA' ? 'outline-danger' : 'outline-secondary'} className="mm-editar" onClick={() => setEditar({ fecha: d.fecha, editable: true })}>
                          {d.estado === 'FALTA' ? <><PlusLg /> Añadir</> : <PencilSquare />}
                        </Button>
                      )}
                    </span>
                  </li>
                );
              })}
              {visibles.length === 0 && <li className="text-secondary small">Nada que mostrar en este mes todavía.</li>}
            </ul>
          </>
        ) : null}
      </Card.Body>

      {editar && (
        <MiDiaModal fecha={editar.fecha} editable={editar.editable} onClose={() => setEditar(null)} onCambiado={cargar} />
      )}
    </Card>
  );
}
