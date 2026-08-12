import { useState } from 'react';
import { Alert, Badge, Button, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { Download } from 'react-bootstrap-icons';
import type { ImportUsuariosResultDto } from '@yorga/contracts';
import { usersGateway } from '../composition';

/**
 * MEJ · Import masivo de usuarios desde Excel. Sube el fichero, muestra qué se creó (con su **contraseña
 * temporal**, descargable en CSV para repartir) y qué se saltó y por qué. Cada usuario creado lleva también su
 * ficha de empleado (RRHH).
 */
export function ImportUsuariosModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState<ImportUsuariosResultDto | null>(null);

  async function importar() {
    if (!file) return;
    setImportando(true);
    setError('');
    try {
      const r = await usersGateway.importar(file);
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
      ['email', 'nombre', 'rol', 'contraseña temporal', 'ficha RRHH'],
      ...res.creados.map((c) => [c.email, c.name, c.role, c.passwordTemporal, c.fichaCreada ? 'sí' : 'no']),
    ];
    const csv = filas.map((f) => f.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credenciales_usuarios.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal show onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title className="h6">Importar usuarios desde Excel</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger" className="py-2" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

        {!res ? (
          <>
            <p className="text-secondary small mb-3">
              El Excel debe tener al menos las columnas <strong>email</strong> y <strong>nombre</strong> (opcional
              <strong> rol</strong>). Cada usuario se crea con una <strong>contraseña temporal</strong> (que verás
              aquí para repartir) y su <strong>ficha de empleado</strong>. Los duplicados o filas incompletas se
              saltan avisando.
            </p>
            <Form.Control type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => setFile((e.target as HTMLInputElement).files?.[0] ?? null)} />
          </>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span>
                <Badge bg="success-subtle" text="success" className="me-2">{res.creados.length} creados</Badge>
                {res.saltados.length > 0 && <Badge bg="warning-subtle" text="warning">{res.saltados.length} saltados</Badge>}
              </span>
              {res.creados.length > 0 && (
                <Button size="sm" variant="outline-secondary" onClick={descargarCsv}><Download className="me-1" /> Descargar credenciales (CSV)</Button>
              )}
            </div>

            {res.creados.length > 0 && (
              <div className="table-responsive" style={{ maxHeight: 300 }}>
                <Table size="sm" className="align-middle">
                  <thead><tr><th>Email</th><th>Nombre</th><th>Rol</th><th>Contraseña temporal</th><th>Ficha</th></tr></thead>
                  <tbody>
                    {res.creados.map((c) => (
                      <tr key={c.email}>
                        <td>{c.email}</td>
                        <td>{c.name}</td>
                        <td>{c.role}</td>
                        <td><code>{c.passwordTemporal}</code></td>
                        <td>{c.fichaCreada ? '✓' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}

            {res.saltados.length > 0 && (
              <>
                <div className="fw-semibold small mt-3 mb-1">Saltados</div>
                <ul className="list-unstyled small mb-0">
                  {res.saltados.map((s, i) => (
                    <li key={i} className="text-secondary">Fila {s.fila} · {s.email || '(sin email)'} — {s.motivo}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="text-secondary small mt-3 mb-0">Guarda o descarga las contraseñas temporales ahora: no se vuelven a mostrar. Cada usuario la cambia al entrar.</p>
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
