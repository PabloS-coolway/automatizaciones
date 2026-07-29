import { useEffect, useMemo, useState } from 'react';
import { Button, Card } from 'react-bootstrap';
import { ChevronLeft, ChevronRight } from 'react-bootstrap-icons';
import { ESTADO_AUSENCIA_LABELS, type AbsenceDto, type HolidayDto } from '@yorga/contracts';
import { rrhhGateway } from '../../composition';

const DIAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
// Paleta estable para colorear por tipo de ausencia (se reparte por orden alfabético del tipo).
const PALETA = ['#4f83cc', '#e2725b', '#5aa469', '#b072d1', '#d9a441', '#4bb3b3', '#c76b98'];

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * REQ-008 · "Mi calendario" — el AÑO entero del propio empleado con sus ausencias, coloreadas por tipo, con
 * leyenda y marca de hoy (inspirado en Factorial). Se pinta en cliente con `misAusencias`; no necesita
 * endpoint nuevo. Los rechazados y cancelados no se muestran; los pendientes van con borde punteado.
 */
export function MiCalendarioAnual({ ausencias, centerId }: { ausencias: AbsenceDto[]; centerId?: number | null }) {
  const hoy = new Date();
  const hoyIso = iso(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const [year, setYear] = useState(hoy.getFullYear());
  const [festivos, setFestivos] = useState<HolidayDto[]>([]);

  // Festivos aplicables (globales + los del propio centro), para marcarlos en el año.
  useEffect(() => {
    rrhhGateway.listFestivos(year, centerId ?? undefined).then(setFestivos).catch(() => setFestivos([]));
  }, [year, centerId]);

  const festivoPorDia = useMemo(() => new Map(festivos.map((f) => [f.date, f])), [festivos]);

  // Sólo lo que "cuenta" visualmente: aprobadas y pendientes (los rechazados/cancelados no ensucian el año).
  const visibles = useMemo(() => ausencias.filter((a) => a.status === 'APPROVED' || a.status === 'PENDING'), [ausencias]);

  // Color por tipo, estable (orden alfabético del nombre del tipo).
  const colorPorTipo = useMemo(() => {
    const tipos = [...new Set(visibles.map((a) => a.typeName))].sort();
    return new Map(tipos.map((t, i) => [t, PALETA[i % PALETA.length]]));
  }, [visibles]);

  // Para cada día ISO, la ausencia que lo cubre (la primera; basta para colorear).
  const porDia = useMemo(() => {
    const m = new Map<string, AbsenceDto>();
    for (const a of visibles) {
      for (let t = new Date(`${a.startDate}T00:00:00Z`).getTime(); t <= new Date(`${a.endDate}T00:00:00Z`).getTime(); t += 86_400_000) {
        const d = new Date(t);
        m.set(iso(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()), a);
      }
    }
    return m;
  }, [visibles]);

  const tiposUsados = [...colorPorTipo.entries()];

  return (
    <Card>
      <Card.Body className="p-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
          <div className="d-flex align-items-center gap-2">
            <Button size="sm" variant="outline-secondary" onClick={() => setYear((y) => y - 1)}><ChevronLeft /></Button>
            <span className="fw-semibold" style={{ minWidth: 60, textAlign: 'center' }}>{year}</span>
            <Button size="sm" variant="outline-secondary" onClick={() => setYear((y) => y + 1)}><ChevronRight /></Button>
          </div>
          <div className="d-flex flex-wrap gap-2 align-items-center">
            {tiposUsados.length === 0 && <span className="text-secondary small">Sin ausencias este año.</span>}
            {tiposUsados.map(([t, c]) => (
              <span key={t} className="d-inline-flex align-items-center gap-1 small">
                <span style={{ width: 12, height: 12, borderRadius: 3, background: c, display: 'inline-block' }} /> {t}
              </span>
            ))}
          </div>
        </div>

        <div className="miano-grid">
          {MESES.map((nombre, mes) => {
            const primerDia = (new Date(year, mes, 1).getDay() + 6) % 7; // lunes = 0
            const diasMes = new Date(year, mes + 1, 0).getDate();
            const celdas: (number | null)[] = [...Array(primerDia).fill(null), ...Array.from({ length: diasMes }, (_, i) => i + 1)];
            return (
              <div key={mes} className="miano-mes">
                <div className="miano-titulo">{nombre}</div>
                <div className="miano-dias">
                  {DIAS.map((d) => (<div key={d} className="miano-cab">{d}</div>))}
                  {celdas.map((dia, i) => {
                    if (dia == null) return <div key={i} className="miano-cel" />;
                    const clave = iso(year, mes, dia);
                    const a = porDia.get(clave);
                    const festivo = festivoPorDia.get(clave);
                    const esHoy = clave === hoyIso;
                    const color = a ? colorPorTipo.get(a.typeName) : undefined;
                    const pendiente = a?.status === 'PENDING';
                    const titulo = [
                      a ? `${a.typeName} · ${ESTADO_AUSENCIA_LABELS[a.status]}${a.halfDay ? ' · medio día' : ''}` : null,
                      festivo ? `Festivo: ${festivo.name}` : null,
                    ].filter(Boolean).join(' · ') || undefined;
                    // Festivo sin ausencia: fondo tenue + número resaltado. Con ausencia: manda el color de la ausencia.
                    const estilo = color
                      ? { background: pendiente ? 'transparent' : color, color: pendiente ? 'inherit' : '#fff', border: pendiente ? `1.5px dashed ${color}` : undefined }
                      : festivo ? { background: 'var(--festivo-bg, rgba(217,164,65,.22))', fontWeight: 700 } : undefined;
                    return (
                      <div
                        key={i}
                        className={`miano-cel ${esHoy ? 'miano-hoy' : ''}`}
                        title={titulo}
                        style={estilo}
                      >
                        {dia}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-secondary small mt-3 d-flex flex-wrap gap-3">
          <span><span className="miano-cel miano-hoy d-inline-block align-middle" style={{ width: 18, height: 18 }} /> hoy</span>
          <span className="d-inline-flex align-items-center gap-1"><span style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(217,164,65,.22)', display: 'inline-block' }} /> festivo</span>
          <span>Relleno = aprobada · borde punteado = pendiente</span>
        </div>
      </Card.Body>
    </Card>
  );
}
