import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, ExclamationTriangleFill } from 'react-bootstrap-icons';
import { ESTADO_DIA_LABELS, type DiaResumenDto, type EstadoDia, type ResumenMesDto } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';
import { formatearMinutos } from '../../../domain/fichaje-csv';
import { MiDiaModal } from './MiDiaModal';
import { Skeleton } from '../../components/Skeleton';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
// Clase de color por estado del día en el calendario.
const CLASE: Record<EstadoDia, string> = {
  OK: 'mmc-ok',
  INCOMPLETO: 'mmc-warn',
  FALTA: 'mmc-falta',
  FESTIVO: 'mmc-festivo',
  FIN_SEMANA: 'mmc-finde',
  AUSENCIA: 'mmc-ausencia',
  HOY: 'mmc-hoy',
  FUTURO: 'mmc-vacio',
  PREVIO: 'mmc-vacio',
};

const pad = (n: number) => String(n).padStart(2, '0');
const isoLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * REQ-008 · "Mi jornada" por MES en formato **calendario** (mucho más escaneable que una lista): un color por
 * estado del día, las horas dentro de la celda y los días laborables sin fichar marcados en rojo. Navegable por
 * mes (escala a años). Clic en un día para revisarlo/corregirlo (los recientes se pueden editar).
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
  const esEditable = (d: DiaResumenDto) =>
    d.estado !== 'FUTURO' && d.estado !== 'PREVIO' && d.fecha >= limiteEdicion && d.fecha <= hoyISO;

  const porDia = useMemo(() => new Map((data?.dias ?? []).map((d) => [d.fecha, d])), [data]);
  const primerDia = (new Date(year, month - 1, 1).getDay() + 6) % 7; // lunes = 0
  const diasMes = new Date(year, month, 0).getDate();
  const celdas: (number | null)[] = [...Array(primerDia).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
  const mesLargo = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const mesLabel = mesLargo.charAt(0).toUpperCase() + mesLargo.slice(1); // "Julio de 2026" (no "De")

  function descargarCsv() {
    if (!data) return;
    const conDatos = data.dias.filter((d) => d.estado !== 'FUTURO' && d.estado !== 'PREVIO');
    const filas = [['fecha', 'estado', 'minutos', 'extra'], ...conDatos.map((d) => [d.fecha, d.estado, String(d.minutosTrabajados), String(d.minutosExtra)])];
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
            <span className="fw-semibold" style={{ minWidth: 140, textAlign: 'center' }}>{mesLabel}</span>
            <Button size="sm" variant="outline-secondary" onClick={() => mover(1)}><ChevronRight /></Button>
          </div>
          {data && <Button size="sm" variant="outline-secondary" onClick={descargarCsv}>CSV</Button>}
        </div>

        {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

        {loading ? (
          <Skeleton className="mmc-skeleton" />
        ) : data ? (
          <>
            <div className="d-flex flex-wrap gap-3 mb-3 text-secondary small">
              <span>Trabajado: <strong>{formatearMinutos(data.totalMinutos)}</strong></span>
              {data.totalExtra > 0 && <span>Extra: <strong>{formatearMinutos(data.totalExtra)}</strong></span>}
              {data.faltan > 0 && (
                <span className="text-danger"><ExclamationTriangleFill className="me-1" /><strong>{data.faltan}</strong> día(s) sin fichar</span>
              )}
            </div>

            <div className="mmc-grid">
              {DIAS.map((d) => (<div key={d} className="mmc-cab">{d}</div>))}
              {celdas.map((dia, i) => {
                if (dia == null) return <div key={i} className="mmc-cel mmc-empty" />;
                const d = porDia.get(`${year}-${pad(month)}-${pad(dia)}`);
                if (!d) return <div key={i} className="mmc-cel" />;
                const oculto = d.estado === 'FUTURO' || d.estado === 'PREVIO';
                const editable = esEditable(d);
                const titulo = [ESTADO_DIA_LABELS[d.estado] || '', d.etiqueta ?? '', d.minutosTrabajados > 0 ? formatearMinutos(d.minutosTrabajados) : ''].filter(Boolean).join(' · ');
                return (
                  <button
                    key={i}
                    type="button"
                    className={`mmc-cel ${CLASE[d.estado]} ${editable ? 'mmc-clic' : ''}`}
                    disabled={oculto}
                    title={titulo || undefined}
                    onClick={() => !oculto && setEditar({ fecha: d.fecha, editable })}
                  >
                    <span className="mmc-num">{dia}</span>
                    {d.minutosTrabajados > 0 && <span className="mmc-h">{formatearMinutos(d.minutosTrabajados)}</span>}
                    {d.estado === 'FALTA' && <span className="mmc-falta-dot">falta</span>}
                    {d.etiqueta && d.minutosTrabajados === 0 && <span className="mmc-etq">{d.etiqueta}</span>}
                  </button>
                );
              })}
            </div>

            <div className="mmc-leyenda text-secondary small mt-3">
              <span><i className="mmc-dot mmc-ok" /> fichado</span>
              <span><i className="mmc-dot mmc-falta" /> falta fichar</span>
              <span><i className="mmc-dot mmc-warn" /> sin cerrar</span>
              <span><i className="mmc-dot mmc-ausencia" /> ausencia</span>
              <span><i className="mmc-dot mmc-festivo" /> festivo</span>
            </div>
          </>
        ) : null}
      </Card.Body>

      {editar && (
        <MiDiaModal fecha={editar.fecha} editable={editar.editable} onClose={() => setEditar(null)} onCambiado={cargar} />
      )}
    </Card>
  );
}
