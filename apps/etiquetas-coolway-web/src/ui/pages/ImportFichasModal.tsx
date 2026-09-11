import { useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { Download } from 'react-bootstrap-icons';
import type { ImportFichasResultDto } from '@yorga/contracts';
import { rrhhGateway } from '../composition';

/**
 * REQ-012 · Import de fichas de RRHH desde el Excel agrupado de Ángeles (12 columnas). Sube el fichero y muestra
 * qué se creó/actualizó por su clave de negocio (empresa + código) y qué se saltó y por qué (cabeceras de grupo,
 * totales, datos incompletos, choques de identidad). Los altas nuevas traen su contraseña temporal (descargable).
 */
export function ImportFichasModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState<ImportFichasResultDto | null>(null);

  async function importar() {
    if (!file) return;
    setImportando(true);
    setError('');
    try {
      const r = await rrhhGateway.importarFichas(file);
      setRes(r);
      onImported();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImportando(false);
    }
  }

  function descargarCsv() {
    if (!res) return;
    const filas = [
      ['empresa', 'codigo', 'nombre', 'email', 'contraseña temporal'],
      ...res.creados.map((c) => [c.empresa, c.codigo, c.nombre, c.email ?? '', c.passwordTemporal ?? '']),
    ];
    const csv = filas.map((f) => f.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fichas_credenciales.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal show onHide={onClose} centered size="xl" fullscreen="lg-down">
      <Modal.Header closeButton>
        <Modal.Title className="h6">Importar fichas de RRHH desde Excel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" className="py-2" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

        {!res ? (
          <>
            <p className="text-secondary small mb-3">
              Excel <strong>agrupado</strong> de RRHH (12 columnas): nº empresa, código, nombre, categoría, fecha
              alta, DNI, sección, contrato, antigüedad, correo, nombre de empresa y zona. Las filas de{' '}
              <strong>cabecera de grupo</strong> (departamento/tienda) y <strong>Totales</strong> se saltan solas; la
              zona se arrastra dentro del grupo. Cada ficha se crea/actualiza por su clave{' '}
              <strong>(empresa + código)</strong> — reimportar no duplica.
            </p>
            <Form.Control
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => setFile((e.target as HTMLInputElement).files?.[0] ?? null)}
            />
          </>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
              <span>
                <Badge bg="success-subtle" text="success" className="me-2">{res.totales.creados} creados</Badge>
                <Badge bg="info-subtle" text="info" className="me-2">{res.totales.actualizados} actualizados</Badge>
                {res.totales.saltados > 0 && <Badge bg="warning-subtle" text="warning">{res.totales.saltados} saltados</Badge>}
              </span>
              {res.creados.length > 0 && (
                <Button size="sm" variant="outline-secondary" onClick={descargarCsv}><Download className="me-1" /> Descargar credenciales (CSV)</Button>
              )}
            </div>

            {res.creados.length > 0 && (
              <>
                <div className="fw-semibold small mt-2 mb-1">Altas nuevas</div>
                <div className="table-responsive" style={{ maxHeight: 240 }}>
                  <Table size="sm" className="align-middle">
                    <thead><tr><th>Empresa</th><th>Código</th><th>Nombre</th><th>Correo</th><th>Contraseña temporal</th></tr></thead>
                    <tbody>
                      {res.creados.map((c, i) => (
                        <tr key={i}>
                          <td>{c.empresa}</td>
                          <td>{c.codigo}</td>
                          <td>{c.nombre}</td>
                          <td>{c.email ?? '—'}</td>
                          <td>{c.passwordTemporal ? <code>{c.passwordTemporal}</code> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </>
            )}

            {res.actualizados.length > 0 && (
              <>
                <div className="fw-semibold small mt-3 mb-1">Actualizados</div>
                <div className="table-responsive" style={{ maxHeight: 180 }}>
                  <Table size="sm" className="align-middle">
                    <thead><tr><th>Empresa</th><th>Código</th><th>Nombre</th></tr></thead>
                    <tbody>
                      {res.actualizados.map((c, i) => (
                        <tr key={i}><td>{c.empresa}</td><td>{c.codigo}</td><td>{c.nombre}</td></tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </>
            )}

            {res.saltados.length > 0 && (
              <>
                <div className="fw-semibold small mt-3 mb-1">Saltados</div>
                <ul className="list-unstyled small mb-0" style={{ maxHeight: 180, overflowY: 'auto' }}>
                  {res.saltados.map((s, i) => (
                    <li key={i} className="text-secondary">Fila {s.fila} · {s.nombre || s.codigo || '(sin datos)'} — {s.motivo}</li>
                  ))}
                </ul>
              </>
            )}
            {res.creados.length > 0 && (
              <p className="text-secondary small mt-3 mb-0">Guarda o descarga las contraseñas temporales ahora: no se vuelven a mostrar. Cada usuario la cambia al entrar.</p>
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {!res ? (
          <>
            <Button variant="outline-secondary" onClick={onClose}>Cancelar</Button>
            <Button className="btn-brand" onClick={importar} disabled={!file || importando}>
              {importando ? <Spinner as="span" size="sm" animation="border" /> : 'Importar'}
            </Button>
          </>
        ) : (
          <Button className="btn-brand" onClick={onClose}>Cerrar</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
}
