import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Nav, Spinner, Table } from 'react-bootstrap';
import { PencilSquare, PlusLg, ShieldLock, Trash } from 'react-bootstrap-icons';
import type {
  AbsenceTypeDto,
  CategoriaDto,
  CompanyDto,
  ContractTypeDto,
  ConvenioDto,
  ConvenioPermisoDto,
  SeccionDto,
  ZoneDto,
} from '@yorga/contracts';
import { rrhhGateway } from '../../composition';

type Sub = 'empresas' | 'zonas' | 'convenios' | 'categorias' | 'contratos' | 'secciones';

const SUBS: { key: Sub; label: string }[] = [
  { key: 'empresas', label: 'Empresas' },
  { key: 'zonas', label: 'Zonas' },
  { key: 'convenios', label: 'Convenios' },
  { key: 'categorias', label: 'Categorías' },
  { key: 'contratos', label: 'Contratos' },
  { key: 'secciones', label: 'Secciones' },
];

/**
 * REQ-012 · Bloque 3 · Gestión maestra. CRUD de la capa organizativa de RRHH que hasta ahora sólo nacía por el
 * importador: empresas, zonas (con su convenio), convenios (con el editor convenio→permisos) y los catálogos
 * (categoría / tipo de contrato / sección). Nada que esté en uso se puede borrar (lo impide la API y aquí se avisa).
 */
export function MaestrosRrhhManager() {
  const [sub, setSub] = useState<Sub>('empresas');
  const [empresas, setEmpresas] = useState<CompanyDto[]>([]);
  const [zonas, setZonas] = useState<ZoneDto[]>([]);
  const [convenios, setConvenios] = useState<ConvenioDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [contratos, setContratos] = useState<ContractTypeDto[]>([]);
  const [secciones, setSecciones] = useState<SeccionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      rrhhGateway.listEmpresas(),
      rrhhGateway.listZonas(),
      rrhhGateway.listConvenios(),
      rrhhGateway.listCategorias(),
      rrhhGateway.listContratos(),
      rrhhGateway.listSecciones(),
    ])
      .then(([e, z, cv, cat, con, sec]) => {
        setEmpresas(e);
        setZonas(z);
        setConvenios(cv);
        setCategorias(cat);
        setContratos(con);
        setSecciones(sec);
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => reload(), [reload]);

  if (loading) {
    return (
      <div className="text-secondary py-5 text-center">
        <Spinner animation="border" size="sm" className="me-2" /> Cargando datos maestros…
      </div>
    );
  }

  return (
    <div>
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}

      <Nav variant="pills" activeKey={sub} onSelect={(k) => setSub((k as Sub) ?? 'empresas')} className="mb-3 flex-wrap gap-1">
        {SUBS.map((s) => (
          <Nav.Item key={s.key}>
            <Nav.Link eventKey={s.key}>{s.label}</Nav.Link>
          </Nav.Item>
        ))}
      </Nav>

      {sub === 'empresas' && <EmpresasSeccion empresas={empresas} onError={setError} onChange={reload} />}
      {sub === 'zonas' && <ZonasSeccion zonas={zonas} convenios={convenios} onError={setError} onChange={reload} />}
      {sub === 'convenios' && <ConveniosSeccion convenios={convenios} onError={setError} onChange={reload} />}
      {sub === 'categorias' && <CategoriasSeccion categorias={categorias} onError={setError} onChange={reload} />}
      {sub === 'contratos' && <ContratosSeccion contratos={contratos} onError={setError} onChange={reload} />}
      {sub === 'secciones' && <SeccionesSeccion secciones={secciones} onError={setError} onChange={reload} />}
    </div>
  );
}

// ==================== Empresas ====================

function EmpresasSeccion({ empresas, onError, onChange }: { empresas: CompanyDto[]; onError: (m: string) => void; onChange: () => void }) {
  const [modal, setModal] = useState<null | CompanyDto | 'nueva'>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function borrar(c: CompanyDto) {
    if (!confirm(`¿Borrar la empresa "${c.name}"?`)) return;
    setBusyId(c.id);
    onError('');
    try {
      await rrhhGateway.borrarEmpresa(c.id);
      onChange();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <Card.Body>
        <Cabecera titulo={`Empresas (${empresas.length})`} onNueva={() => setModal('nueva')} />
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr className="text-secondary small text-uppercase">
              <th>Código</th>
              <th>Nombre</th>
              <th className="text-end">Empleados</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {empresas.map((c) => (
              <tr key={c.id}>
                <td><Badge bg="secondary-subtle" text="secondary">{c.code}</Badge></td>
                <td>{c.name}</td>
                <td className="text-end text-secondary">{c.employees}</td>
                <td className="text-end"><Acciones onEdit={() => setModal(c)} onDelete={() => borrar(c)} busy={busyId === c.id} deshabilitarBorrar={c.employees > 0} /></td>
              </tr>
            ))}
            {empresas.length === 0 && <Vacio colSpan={4} texto="Aún no hay empresas." />}
          </tbody>
        </Table>
      </Card.Body>
      {modal && (
        <CodeNameModal
          titulo={modal === 'nueva' ? 'Nueva empresa' : 'Editar empresa'}
          codeLabel="Código"
          nameLabel="Nombre / razón social"
          inicial={modal === 'nueva' ? { code: '', name: '' } : { code: modal.code, name: modal.name }}
          onError={onError}
          onClose={() => setModal(null)}
          onSave={async ({ code, name }) => {
            if (modal === 'nueva') await rrhhGateway.crearEmpresa({ code, name });
            else await rrhhGateway.editarEmpresa(modal.id, { code, name });
            setModal(null);
            onChange();
          }}
        />
      )}
    </Card>
  );
}

// ==================== Zonas ====================

function ZonasSeccion({ zonas, convenios, onError, onChange }: { zonas: ZoneDto[]; convenios: ConvenioDto[]; onError: (m: string) => void; onChange: () => void }) {
  const [modal, setModal] = useState<null | ZoneDto | 'nueva'>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function borrar(z: ZoneDto) {
    if (!confirm(`¿Borrar la zona "${z.name}"?`)) return;
    setBusyId(z.id);
    onError('');
    try {
      await rrhhGateway.borrarZona(z.id);
      onChange();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <Card.Body>
        <Cabecera titulo={`Zonas (${zonas.length})`} onNueva={() => setModal('nueva')} />
        <p className="text-secondary small">La zona determina el <strong>convenio</strong> aplicable, y el convenio los permisos del trabajador.</p>
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr className="text-secondary small text-uppercase">
              <th>Zona</th>
              <th>Convenio</th>
              <th className="text-end">Centros</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {zonas.map((z) => (
              <tr key={z.id}>
                <td>{z.name}</td>
                <td>{z.convenioName ?? <span className="text-secondary">— Sin convenio —</span>}</td>
                <td className="text-end text-secondary">{z.centers}</td>
                <td className="text-end"><Acciones onEdit={() => setModal(z)} onDelete={() => borrar(z)} busy={busyId === z.id} deshabilitarBorrar={z.centers > 0} /></td>
              </tr>
            ))}
            {zonas.length === 0 && <Vacio colSpan={4} texto="Aún no hay zonas." />}
          </tbody>
        </Table>
      </Card.Body>
      {modal && (
        <ZonaModal
          titulo={modal === 'nueva' ? 'Nueva zona' : 'Editar zona'}
          convenios={convenios}
          inicial={modal === 'nueva' ? { name: '', convenioId: '' } : { name: modal.name, convenioId: modal.convenioId != null ? String(modal.convenioId) : '' }}
          onError={onError}
          onClose={() => setModal(null)}
          onSave={async ({ name, convenioId }) => {
            const payload = { name, convenioId: convenioId ? Number(convenioId) : null };
            if (modal === 'nueva') await rrhhGateway.crearZona(payload);
            else await rrhhGateway.editarZona(modal.id, payload);
            setModal(null);
            onChange();
          }}
        />
      )}
    </Card>
  );
}

// ==================== Convenios (con editor de permisos) ====================

function ConveniosSeccion({ convenios, onError, onChange }: { convenios: ConvenioDto[]; onError: (m: string) => void; onChange: () => void }) {
  const [modal, setModal] = useState<null | ConvenioDto | 'nuevo'>(null);
  const [permisosDe, setPermisosDe] = useState<ConvenioDto | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function borrar(c: ConvenioDto) {
    if (!confirm(`¿Borrar el convenio "${c.name}"?`)) return;
    setBusyId(c.id);
    onError('');
    try {
      await rrhhGateway.borrarConvenio(c.id);
      onChange();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <Card.Body>
        <Cabecera titulo={`Convenios (${convenios.length})`} onNueva={() => setModal('nuevo')} />
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr className="text-secondary small text-uppercase">
              <th>Código</th>
              <th>Nombre</th>
              <th className="text-end">Zonas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {convenios.map((c) => (
              <tr key={c.id}>
                <td>{c.code ? <Badge bg="secondary-subtle" text="secondary">{c.code}</Badge> : <span className="text-secondary">—</span>}</td>
                <td>{c.name}</td>
                <td className="text-end text-secondary">{c.zonas}</td>
                <td className="text-end">
                  <div className="d-flex gap-1 justify-content-end">
                    <Button size="sm" variant="outline-primary" title="Editar permisos del convenio" onClick={() => setPermisosDe(c)}>
                      <ShieldLock className="me-1" />Permisos
                    </Button>
                    <Acciones onEdit={() => setModal(c)} onDelete={() => borrar(c)} busy={busyId === c.id} deshabilitarBorrar={c.zonas > 0} />
                  </div>
                </td>
              </tr>
            ))}
            {convenios.length === 0 && <Vacio colSpan={4} texto="Aún no hay convenios." />}
          </tbody>
        </Table>
      </Card.Body>
      {modal && (
        <CodeNameModal
          titulo={modal === 'nuevo' ? 'Nuevo convenio' : 'Editar convenio'}
          codeLabel="Código (opcional)"
          codeOpcional
          nameLabel="Nombre del convenio"
          inicial={modal === 'nuevo' ? { code: '', name: '' } : { code: modal.code ?? '', name: modal.name }}
          onError={onError}
          onClose={() => setModal(null)}
          onSave={async ({ code, name }) => {
            const payload = { code: code || null, name };
            if (modal === 'nuevo') await rrhhGateway.crearConvenio(payload);
            else await rrhhGateway.editarConvenio(modal.id, payload);
            setModal(null);
            onChange();
          }}
        />
      )}
      {permisosDe && <PermisosConvenioModal convenio={permisosDe} onError={onError} onClose={() => setPermisosDe(null)} />}
    </Card>
  );
}

// ==================== Catálogos: categorías / contratos / secciones ====================

function CategoriasSeccion({ categorias, onError, onChange }: { categorias: CategoriaDto[]; onError: (m: string) => void; onChange: () => void }) {
  const [modal, setModal] = useState<null | CategoriaDto | 'nueva'>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function borrar(c: CategoriaDto) {
    if (!confirm(`¿Borrar la categoría "${c.name}"?`)) return;
    setBusyId(c.id);
    onError('');
    try {
      await rrhhGateway.borrarCategoria(c.id);
      onChange();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <Card.Body>
        <Cabecera titulo={`Categorías (${categorias.length})`} onNueva={() => setModal('nueva')} />
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr className="text-secondary small text-uppercase">
              <th>Código</th>
              <th>Nombre</th>
              <th className="text-end">Empleados</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c.id}>
                <td>{c.code ? <Badge bg="secondary-subtle" text="secondary">{c.code}</Badge> : <span className="text-secondary">—</span>}</td>
                <td>{c.name}</td>
                <td className="text-end text-secondary">{c.employees}</td>
                <td className="text-end"><Acciones onEdit={() => setModal(c)} onDelete={() => borrar(c)} busy={busyId === c.id} deshabilitarBorrar={c.employees > 0} /></td>
              </tr>
            ))}
            {categorias.length === 0 && <Vacio colSpan={4} texto="Aún no hay categorías." />}
          </tbody>
        </Table>
      </Card.Body>
      {modal && (
        <CodeNameModal
          titulo={modal === 'nueva' ? 'Nueva categoría' : 'Editar categoría'}
          codeLabel="Código (opcional)"
          codeOpcional
          nameLabel="Nombre de la categoría"
          inicial={modal === 'nueva' ? { code: '', name: '' } : { code: modal.code ?? '', name: modal.name }}
          onError={onError}
          onClose={() => setModal(null)}
          onSave={async ({ code, name }) => {
            const payload = { code: code || null, name };
            if (modal === 'nueva') await rrhhGateway.crearCategoria(payload);
            else await rrhhGateway.editarCategoria(modal.id, payload);
            setModal(null);
            onChange();
          }}
        />
      )}
    </Card>
  );
}

function ContratosSeccion({ contratos, onError, onChange }: { contratos: ContractTypeDto[]; onError: (m: string) => void; onChange: () => void }) {
  const [modal, setModal] = useState<null | ContractTypeDto | 'nuevo'>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function borrar(c: ContractTypeDto) {
    if (!confirm(`¿Borrar el tipo de contrato "${c.code}"?`)) return;
    setBusyId(c.id);
    onError('');
    try {
      await rrhhGateway.borrarContrato(c.id);
      onChange();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <Card.Body>
        <Cabecera titulo={`Tipos de contrato (${contratos.length})`} onNueva={() => setModal('nuevo')} />
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr className="text-secondary small text-uppercase">
              <th>Código</th>
              <th>Nombre</th>
              <th className="text-end">Empleados</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {contratos.map((c) => (
              <tr key={c.id}>
                <td><Badge bg="secondary-subtle" text="secondary">{c.code}</Badge></td>
                <td>{c.name ?? <span className="text-secondary">—</span>}</td>
                <td className="text-end text-secondary">{c.employees}</td>
                <td className="text-end"><Acciones onEdit={() => setModal(c)} onDelete={() => borrar(c)} busy={busyId === c.id} deshabilitarBorrar={c.employees > 0} /></td>
              </tr>
            ))}
            {contratos.length === 0 && <Vacio colSpan={4} texto="Aún no hay tipos de contrato." />}
          </tbody>
        </Table>
      </Card.Body>
      {modal && (
        <CodeNameModal
          titulo={modal === 'nuevo' ? 'Nuevo tipo de contrato' : 'Editar tipo de contrato'}
          codeLabel="Código"
          nameLabel="Nombre (opcional)"
          nameOpcional
          inicial={modal === 'nuevo' ? { code: '', name: '' } : { code: modal.code, name: modal.name ?? '' }}
          onError={onError}
          onClose={() => setModal(null)}
          onSave={async ({ code, name }) => {
            const payload = { code, name: name || null };
            if (modal === 'nuevo') await rrhhGateway.crearContrato(payload);
            else await rrhhGateway.editarContrato(modal.id, payload);
            setModal(null);
            onChange();
          }}
        />
      )}
    </Card>
  );
}

function SeccionesSeccion({ secciones, onError, onChange }: { secciones: SeccionDto[]; onError: (m: string) => void; onChange: () => void }) {
  const [modal, setModal] = useState<null | SeccionDto | 'nueva'>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  async function borrar(c: SeccionDto) {
    if (!confirm(`¿Borrar la sección "${c.code}"?`)) return;
    setBusyId(c.id);
    onError('');
    try {
      await rrhhGateway.borrarSeccion(c.id);
      onChange();
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <Card.Body>
        <Cabecera titulo={`Secciones (${secciones.length})`} onNueva={() => setModal('nueva')} />
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr className="text-secondary small text-uppercase">
              <th>Código</th>
              <th>Nombre</th>
              <th className="text-end">Empleados</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {secciones.map((c) => (
              <tr key={c.id}>
                <td><Badge bg="secondary-subtle" text="secondary">{c.code}</Badge></td>
                <td>{c.name ?? <span className="text-secondary">—</span>}</td>
                <td className="text-end text-secondary">{c.employees}</td>
                <td className="text-end"><Acciones onEdit={() => setModal(c)} onDelete={() => borrar(c)} busy={busyId === c.id} deshabilitarBorrar={c.employees > 0} /></td>
              </tr>
            ))}
            {secciones.length === 0 && <Vacio colSpan={4} texto="Aún no hay secciones." />}
          </tbody>
        </Table>
      </Card.Body>
      {modal && (
        <CodeNameModal
          titulo={modal === 'nueva' ? 'Nueva sección' : 'Editar sección'}
          codeLabel="Código"
          nameLabel="Nombre (opcional)"
          nameOpcional
          inicial={modal === 'nueva' ? { code: '', name: '' } : { code: modal.code, name: modal.name ?? '' }}
          onError={onError}
          onClose={() => setModal(null)}
          onSave={async ({ code, name }) => {
            const payload = { code, name: name || null };
            if (modal === 'nueva') await rrhhGateway.crearSeccion(payload);
            else await rrhhGateway.editarSeccion(modal.id, payload);
            setModal(null);
            onChange();
          }}
        />
      )}
    </Card>
  );
}

// ==================== Piezas reutilizables ====================

function Cabecera({ titulo, onNueva }: { titulo: string; onNueva: () => void }) {
  return (
    <div className="d-flex justify-content-between align-items-center mb-3">
      <Card.Title className="h6 mb-0">{titulo}</Card.Title>
      <Button size="sm" className="btn-brand" onClick={onNueva}><PlusLg className="me-1" />Nuevo</Button>
    </div>
  );
}

function Acciones({ onEdit, onDelete, busy, deshabilitarBorrar }: { onEdit: () => void; onDelete: () => void; busy: boolean; deshabilitarBorrar: boolean }) {
  return (
    <div className="d-inline-flex gap-1">
      <Button size="sm" variant="outline-secondary" title="Editar" onClick={onEdit} disabled={busy}><PencilSquare /></Button>
      <Button size="sm" variant="outline-danger" title={deshabilitarBorrar ? 'En uso: no se puede borrar' : 'Borrar'} onClick={onDelete} disabled={busy || deshabilitarBorrar}>
        {busy ? <Spinner as="span" size="sm" animation="border" /> : <Trash />}
      </Button>
    </div>
  );
}

function Vacio({ colSpan, texto }: { colSpan: number; texto: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-secondary small text-center py-3">{texto}</td>
    </tr>
  );
}

/** Modal genérico código + nombre (empresas, convenios, categorías, contratos, secciones). */
function CodeNameModal({
  titulo,
  codeLabel,
  nameLabel,
  codeOpcional,
  nameOpcional,
  inicial,
  onError,
  onClose,
  onSave,
}: {
  titulo: string;
  codeLabel: string;
  nameLabel: string;
  codeOpcional?: boolean;
  nameOpcional?: boolean;
  inicial: { code: string; name: string };
  onError: (m: string) => void;
  onClose: () => void;
  onSave: (v: { code: string; name: string }) => Promise<void>;
}) {
  const [code, setCode] = useState(inicial.code);
  const [name, setName] = useState(inicial.name);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError('');
    try {
      await onSave({ code: code.trim(), name: name.trim() });
    } catch (err) {
      onError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal show onHide={onClose} centered backdrop="static">
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title className="h6">{titulo}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-1">{codeLabel}</Form.Label>
            <Form.Control value={code} autoFocus onChange={(e) => setCode(e.target.value)} required={!codeOpcional} />
          </Form.Group>
          <Form.Group>
            <Form.Label className="fw-medium mb-1">{nameLabel}</Form.Label>
            <Form.Control value={name} onChange={(e) => setName(e.target.value)} required={!nameOpcional} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" className="btn-brand" disabled={saving}>{saving ? <Spinner as="span" size="sm" animation="border" /> : 'Guardar'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

/** Modal de zona: nombre + convenio (select). */
function ZonaModal({
  titulo,
  convenios,
  inicial,
  onError,
  onClose,
  onSave,
}: {
  titulo: string;
  convenios: ConvenioDto[];
  inicial: { name: string; convenioId: string };
  onError: (m: string) => void;
  onClose: () => void;
  onSave: (v: { name: string; convenioId: string }) => Promise<void>;
}) {
  const [name, setName] = useState(inicial.name);
  const [convenioId, setConvenioId] = useState(inicial.convenioId);
  const [saving, setSaving] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    onError('');
    try {
      await onSave({ name: name.trim(), convenioId });
    } catch (err) {
      onError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal show onHide={onClose} centered backdrop="static">
      <Form onSubmit={submit}>
        <Modal.Header closeButton><Modal.Title className="h6">{titulo}</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-1">Nombre de la zona</Form.Label>
            <Form.Control value={name} autoFocus onChange={(e) => setName(e.target.value)} required />
          </Form.Group>
          <Form.Group>
            <Form.Label className="fw-medium mb-1">Convenio aplicable</Form.Label>
            <Form.Select value={convenioId} onChange={(e) => setConvenioId(e.target.value)}>
              <option value="">— Sin convenio —</option>
              {convenios.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" className="btn-brand" disabled={saving}>{saving ? <Spinner as="span" size="sm" animation="border" /> : 'Guardar'}</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

// ==================== Editor convenio → permisos ====================

type FilaPermiso = { checked: boolean; diasMax: string; remunerado: '' | 'si' | 'no' };

/**
 * El editor "superimportante": asigna a un convenio qué tipos de ausencia concede, con `diasMax` (opcional) y
 * `remunerado` (sí / no / sin fijar). Al guardar reemplaza el set completo (lo desmarcado se borra).
 */
function PermisosConvenioModal({ convenio, onError, onClose }: { convenio: ConvenioDto; onError: (m: string) => void; onClose: () => void }) {
  const [tipos, setTipos] = useState<AbsenceTypeDto[]>([]);
  const [filas, setFilas] = useState<Record<number, FilaPermiso>>({});
  const [cargando, setCargando] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');

  useEffect(() => {
    let vivo = true;
    Promise.all([rrhhGateway.tiposAusenciaMaestros(), rrhhGateway.permisosConvenio(convenio.id)])
      .then(([ts, permisos]) => {
        if (!vivo) return;
        setTipos(ts);
        const mapa: Record<number, FilaPermiso> = {};
        for (const t of ts) mapa[t.id] = { checked: false, diasMax: '', remunerado: '' };
        for (const p of permisos) {
          mapa[p.absenceTypeId] = {
            checked: true,
            diasMax: p.diasMax != null ? String(p.diasMax) : '',
            remunerado: p.remunerado == null ? '' : p.remunerado ? 'si' : 'no',
          };
        }
        setFilas(mapa);
      })
      .catch((err) => setErrorLocal((err as Error).message))
      .finally(() => vivo && setCargando(false));
    return () => {
      vivo = false;
    };
  }, [convenio.id]);

  function set(id: number, cambio: Partial<FilaPermiso>) {
    setFilas((f) => ({ ...f, [id]: { ...f[id], ...cambio } }));
  }

  async function guardar() {
    setSaving(true);
    setErrorLocal('');
    onError('');
    const permisos: ConvenioPermisoDto[] = tipos
      .filter((t) => filas[t.id]?.checked)
      .map((t) => {
        const fila = filas[t.id];
        const diasMax = fila.diasMax.trim() ? Math.round(Number(fila.diasMax)) : null;
        const remunerado = fila.remunerado === '' ? null : fila.remunerado === 'si';
        return { absenceTypeId: t.id, name: t.name, diasMax, remunerado };
      });
    try {
      await rrhhGateway.setPermisosConvenio(convenio.id, {
        permisos: permisos.map((p) => ({ absenceTypeId: p.absenceTypeId, diasMax: p.diasMax, remunerado: p.remunerado })),
      });
      onClose();
    } catch (err) {
      setErrorLocal((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <Modal show onHide={onClose} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="h6">Permisos del convenio · {convenio.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {errorLocal && <Alert variant="danger" className="py-2">⚠ {errorLocal}</Alert>}
        <p className="text-secondary small">
          Marca los tipos de ausencia que <strong>concede este convenio</strong>. Los días máximos y si es remunerado
          son opcionales (déjalos en blanco / “sin fijar” si el convenio no lo concreta). Lo que desmarques se quita.
        </p>
        {cargando ? (
          <div className="text-secondary py-4 text-center"><Spinner animation="border" size="sm" className="me-2" /> Cargando permisos…</div>
        ) : (
          <Table className="align-middle mb-0">
            <thead>
              <tr className="text-secondary small text-uppercase">
                <th style={{ width: 40 }} />
                <th>Tipo de ausencia</th>
                <th style={{ width: 130 }}>Días máx.</th>
                <th style={{ width: 160 }}>Remunerado</th>
              </tr>
            </thead>
            <tbody>
              {tipos.map((t) => {
                const fila = filas[t.id] ?? { checked: false, diasMax: '', remunerado: '' as const };
                return (
                  <tr key={t.id}>
                    <td>
                      <Form.Check
                        checked={fila.checked}
                        onChange={(e) => set(t.id, { checked: e.target.checked })}
                        aria-label={`Conceder ${t.name}`}
                      />
                    </td>
                    <td>
                      {t.name}{' '}
                      {!t.active && <Badge bg="secondary-subtle" text="secondary">inactivo</Badge>}
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min={0}
                        size="sm"
                        placeholder="—"
                        value={fila.diasMax}
                        disabled={!fila.checked}
                        onChange={(e) => set(t.id, { diasMax: e.target.value })}
                      />
                    </td>
                    <td>
                      <Form.Select size="sm" value={fila.remunerado} disabled={!fila.checked} onChange={(e) => set(t.id, { remunerado: e.target.value as FilaPermiso['remunerado'] })}>
                        <option value="">Sin fijar</option>
                        <option value="si">Sí</option>
                        <option value="no">No</option>
                      </Form.Select>
                    </td>
                  </tr>
                );
              })}
              {tipos.length === 0 && <Vacio colSpan={4} texto="No hay tipos de ausencia en el catálogo." />}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
        <Button className="btn-brand" onClick={guardar} disabled={saving || cargando}>{saving ? <Spinner as="span" size="sm" animation="border" /> : 'Guardar permisos'}</Button>
      </Modal.Footer>
    </Modal>
  );
}
