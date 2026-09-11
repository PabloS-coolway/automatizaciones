import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Nav, Spinner } from 'react-bootstrap';
import { Diagram3, Download, PencilSquare, PersonDash, PersonCheck, PlusLg, Building, ClockHistory, ListUl, Search, FileEarmarkArrowUp } from 'react-bootstrap-icons';
import {
  RRHH_ROLE_LABELS,
  RRHH_ROLES,
  type CenterDto,
  type DepartmentDto,
  type EmployeeDto,
  type OrgEmployeeDto,
  type RrhhRole,
  type RrhhCatalogosDto,
  type EmpleadoPermisosDto,
} from '@yorga/contracts';
import { rrhhGateway } from '../composition';
import { useRrhh } from '../rrhh/RrhhContext';
import { Column, DataTable, useMemoryTable } from '../components/table';
import { OrganigramaLienzo } from './personas/OrganigramaLienzo';
import { EstructuraManager } from './personas/EstructuraManager';
import { PanelFichajes } from './personas/PanelFichajes';
import { ActividadRrhh } from './personas/ActividadRrhh';
import { Skeleton, SkeletonTable } from '../components/Skeleton';
import { plantillaACsv } from '../../domain/plantilla-csv';
import { ImportFichasModal } from './ImportFichasModal';

const VACIO = { email: '', fullName: '', rrhhRole: 'EMPLEADO' as RrhhRole, position: '', managerId: '', centerId: '', departmentId: '', weeklyHours: '', annualLeaveDays: '', birthDate: '', hideBirthday: false, fichajeDesde: '', companyId: '', employeeCode: '', dni: '', categoriaId: '', contractTypeId: '', seccionId: '', fechaAntiguedad: '' };
type Vista = 'plantilla' | 'organigrama' | 'fichajes' | 'estructura' | 'actividad';

/**
 * REQ-008 · Personas. El empleado ve su ficha y (según su rol RRHH) la plantilla que le corresponde. RRHH/Admin
 * gestiona la plantilla (alta/edición/baja/reactivación + responsable + centro/departamento), navega el
 * **organigrama** (segmentado por marca) y administra la **estructura** (centros y departamentos). Todo el
 * dominio de RRHH es independiente del resto del panel; sólo se comparte la identidad (login por correo).
 */
export function PersonasPage() {
  const { employee, loading: rrhhLoading, puedeGestionar, refetch } = useRrhh();
  const [empleados, setEmpleados] = useState<EmployeeDto[]>([]);
  const [orgEmpleados, setOrgEmpleados] = useState<OrgEmployeeDto[]>([]);
  const [centros, setCentros] = useState<CenterDto[]>([]);
  const [departamentos, setDepartamentos] = useState<DepartmentDto[]>([]);
  const [catalogos, setCatalogos] = useState<RrhhCatalogosDto>({ empresas: [], categorias: [], contratos: [], secciones: [] });
  const [permisos, setPermisos] = useState<EmpleadoPermisosDto | null>(null);
  const [permisosCargando, setPermisosCargando] = useState(false);
  const [importFichas, setImportFichas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [vista, setVista] = useState<Vista>('plantilla');
  const [buscar, setBuscar] = useState('');

  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const reload = useCallback(() => {
    if (!employee) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([
      rrhhGateway.listEmpleados(),
      puedeGestionar ? rrhhGateway.listCentros() : Promise.resolve([]),
      puedeGestionar ? rrhhGateway.listDepartamentos() : Promise.resolve([]),
      rrhhGateway.organigrama(), // organigrama completo (público), para todos
      puedeGestionar
        ? rrhhGateway.catalogos()
        : Promise.resolve({ empresas: [], categorias: [], contratos: [], secciones: [] } as RrhhCatalogosDto),
    ])
      .then(([emps, cs, ds, org, cat]) => {
        setEmpleados(emps);
        setCentros(cs);
        setDepartamentos(ds);
        setOrgEmpleados(org);
        setCatalogos(cat);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [employee, puedeGestionar]);

  useEffect(() => reload(), [reload]);

  const nombrePorId = useMemo(() => new Map(empleados.map((e) => [e.id, e.fullName])), [empleados]);

  function abrirAlta() {
    setEditId(null);
    setForm(VACIO);
    setFormError('');
    setPermisos(null);
    setAbierto(true);
  }

  function abrirEdicion(e: EmployeeDto) {
    setEditId(e.id);
    setForm({
      email: e.email,
      fullName: e.fullName,
      rrhhRole: e.rrhhRole,
      position: e.position ?? '',
      managerId: e.managerId != null ? String(e.managerId) : '',
      centerId: e.centerId != null ? String(e.centerId) : '',
      departmentId: e.departmentId != null ? String(e.departmentId) : '',
      weeklyHours: e.weeklyMinutes != null ? String(e.weeklyMinutes / 60) : '',
      annualLeaveDays: e.annualLeaveDays != null ? String(e.annualLeaveDays) : '',
      birthDate: e.birthDate ?? '',
      hideBirthday: e.hideBirthday,
      fichajeDesde: e.fichajeDesde ?? '',
      companyId: e.companyId != null ? String(e.companyId) : '',
      employeeCode: e.employeeCode ?? '',
      dni: e.dni ?? '',
      categoriaId: e.categoriaId != null ? String(e.categoriaId) : '',
      contractTypeId: e.contractTypeId != null ? String(e.contractTypeId) : '',
      seccionId: e.seccionId != null ? String(e.seccionId) : '',
      fechaAntiguedad: e.fechaAntiguedad ?? '',
    });
    setFormError('');
    // REQ-012 · permisos efectivos del empleado (zona → convenio → permisos), solo lectura.
    setPermisos(null);
    setPermisosCargando(true);
    rrhhGateway
      .permisosEmpleado(e.id)
      .then(setPermisos)
      .catch(() => setPermisos(null))
      .finally(() => setPermisosCargando(false));
    setAbierto(true);
  }

  async function onSubmit(ev: FormEvent) {
    ev.preventDefault();
    setFormError('');
    setNotice('');
    setSaving(true);
    const managerId = form.managerId ? Number(form.managerId) : null;
    const centerId = form.centerId ? Number(form.centerId) : null;
    const departmentId = form.departmentId ? Number(form.departmentId) : null;
    const weeklyMinutes = form.weeklyHours.trim() ? Math.round(Number(form.weeklyHours) * 60) : null;
    const annualLeaveDays = form.annualLeaveDays.trim() ? Math.round(Number(form.annualLeaveDays)) : null;
    const birthDate = form.birthDate.trim() || null;
    const fichajeDesde = form.fichajeDesde.trim() || null;
    // REQ-012
    const companyId = form.companyId ? Number(form.companyId) : null;
    const categoriaId = form.categoriaId ? Number(form.categoriaId) : null;
    const contractTypeId = form.contractTypeId ? Number(form.contractTypeId) : null;
    const seccionId = form.seccionId ? Number(form.seccionId) : null;
    const employeeCode = form.employeeCode.trim() || null;
    const dni = form.dni.trim() || null;
    const fechaAntiguedad = form.fechaAntiguedad.trim() || null;
    try {
      if (editId == null) {
        const nuevo = await rrhhGateway.crearEmpleado({
          email: form.email,
          fullName: form.fullName,
          rrhhRole: form.rrhhRole,
          position: form.position || undefined,
          managerId: managerId ?? undefined,
          centerId: centerId ?? undefined,
          departmentId: departmentId ?? undefined,
          weeklyMinutes,
          annualLeaveDays,
          birthDate,
          hideBirthday: form.hideBirthday,
          fichajeDesde: fichajeDesde ?? undefined,
          companyId: companyId ?? undefined,
          employeeCode: employeeCode ?? undefined,
          dni: dni ?? undefined,
          categoriaId: categoriaId ?? undefined,
          contractTypeId: contractTypeId ?? undefined,
          seccionId: seccionId ?? undefined,
          fechaAntiguedad: fechaAntiguedad ?? undefined,
        });
        setNotice(`${nuevo.fullName} dado de alta y enlazado a ${nuevo.email}.`);
      } else {
        const upd = await rrhhGateway.editarEmpleado(editId, {
          fullName: form.fullName,
          rrhhRole: form.rrhhRole,
          position: form.position || null,
          managerId,
          centerId,
          departmentId,
          weeklyMinutes,
          annualLeaveDays,
          birthDate,
          hideBirthday: form.hideBirthday,
          fichajeDesde,
          companyId,
          employeeCode,
          dni,
          categoriaId,
          contractTypeId,
          seccionId,
          fechaAntiguedad,
        });
        setNotice(`Ficha de ${upd.fullName} actualizada.`);
      }
      setAbierto(false);
      setForm(VACIO);
      reload();
      refetch(); // por si el usuario se editó su propia ficha (rol/marca)
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function cambiarEstado(e: EmployeeDto) {
    setError('');
    setNotice('');
    setBusyId(e.id);
    try {
      const r = e.active ? await rrhhGateway.darDeBaja(e.id) : await rrhhGateway.reactivar(e.id);
      setNotice(r.active ? `${r.fullName} reactivado.` : `${r.fullName} dado de baja.`);
      reload();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  const columns = useMemo<Column<EmployeeDto>[]>(() => {
    const base: Column<EmployeeDto>[] = [
      { key: 'fullName', label: 'nombre', value: (e) => e.fullName, render: (e) => <strong>{e.fullName}</strong> },
      { key: 'email', label: 'correo', value: (e) => e.email },
      { key: 'position', label: 'puesto', value: (e) => e.position ?? '', render: (e) => e.position ?? '—' },
      {
        key: 'rrhhRole',
        label: 'rol',
        value: (e) => RRHH_ROLE_LABELS[e.rrhhRole],
        render: (e) => <Badge bg="secondary-subtle" text="secondary">{RRHH_ROLE_LABELS[e.rrhhRole]}</Badge>,
      },
      {
        key: 'managerId',
        label: 'responsable',
        value: (e) => (e.managerId != null ? nombrePorId.get(e.managerId) ?? `#${e.managerId}` : ''),
        render: (e) => (e.managerId != null ? nombrePorId.get(e.managerId) ?? `#${e.managerId}` : '—'),
      },
      { key: 'department', label: 'departamento', value: (e) => e.department ?? '', render: (e) => e.department ?? '—' },
      { key: 'center', label: 'centro / marca', value: (e) => [e.center, e.brand].filter(Boolean).join(' · '), render: (e) => [e.center, e.brand].filter(Boolean).join(' · ') || '—' },
      {
        key: 'active',
        label: 'estado',
        value: (e) => (e.active ? 'activo' : 'baja'),
        render: (e) =>
          e.active ? (
            <Badge bg="success-subtle" text="success">activo</Badge>
          ) : (
            <Badge bg="secondary-subtle" text="secondary">baja</Badge>
          ),
      },
    ];
    if (!puedeGestionar) return base;
    return [
      ...base,
      {
        key: 'acciones',
        label: '',
        sortable: false,
        value: () => '',
        render: (e) => (
          <div className="d-flex gap-1 justify-content-end">
            <Button size="sm" variant="outline-secondary" title="Editar ficha" onClick={() => abrirEdicion(e)} disabled={busyId === e.id}>
              <PencilSquare />
            </Button>
            <Button
              size="sm"
              variant={e.active ? 'outline-danger' : 'outline-success'}
              title={e.active ? 'Dar de baja' : 'Reactivar'}
              onClick={() => cambiarEstado(e)}
              disabled={busyId === e.id}
            >
              {busyId === e.id ? <Spinner as="span" size="sm" animation="border" /> : e.active ? <PersonDash /> : <PersonCheck />}
            </Button>
          </div>
        ),
      },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeGestionar, nombrePorId, busyId]);

  // Buscador global de la plantilla: filtra por nombre, correo, puesto, rol, departamento y centro/marca.
  const empleadosFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    if (!q) return empleados;
    return empleados.filter((e) =>
      [e.fullName, e.email, e.position, RRHH_ROLE_LABELS[e.rrhhRole], e.department, e.center, e.brand]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(q)),
    );
  }, [empleados, buscar]);

  const tabla = useMemoryTable(empleadosFiltrados, columns);

  const posiblesResponsables = useMemo(() => empleados.filter((e) => e.id !== editId), [empleados, editId]);

  function exportarPlantilla() {
    const blob = new Blob([plantillaACsv(empleados)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (rrhhLoading || loading) {
    return (
      <div className="page page-full">
        <header className="page-head mb-4">
          <Skeleton height={30} width={220} className="d-block mb-2" />
          <Skeleton height={16} width={360} />
        </header>
        <Card><Card.Body className="p-4"><SkeletonTable rows={8} cols={7} /></Card.Body></Card>
      </div>
    );
  }

  return (
    <div className="page page-full">
      <header className="page-head mb-4 d-flex justify-content-between align-items-start gap-3">
        <div>
          <h1 className="h4 mb-1">Personas</h1>
          <p className="text-secondary mb-0">Gestión de personal del grupo. Cada empleado entra con su usuario del panel.</p>
        </div>
        {puedeGestionar && employee && (
          <div className="d-flex gap-2 flex-shrink-0">
            <Button variant="outline-secondary" onClick={() => setImportFichas(true)}>
              <FileEarmarkArrowUp className="me-1" />
              Importar fichas
            </Button>
            <Button className="btn-brand" onClick={abrirAlta}>
              <PlusLg className="me-1" />
              Nuevo empleado
            </Button>
          </div>
        )}
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}
      {notice && <Alert variant="success" onClose={() => setNotice('')} dismissible>{notice}</Alert>}

      {!employee ? (
        <Alert variant="light" className="border">
          Aún no tienes <strong>ficha de empleado</strong> en el módulo de personal. Cuando RRHH te dé de alta,
          verás aquí tu ficha y la de tu equipo.
        </Alert>
      ) : (
        <>
          <Nav variant="tabs" activeKey={vista} onSelect={(k) => setVista((k as Vista) ?? 'plantilla')} className="mb-3">
            <Nav.Item><Nav.Link eventKey="plantilla">Plantilla</Nav.Link></Nav.Item>
            <Nav.Item><Nav.Link eventKey="organigrama"><Diagram3 className="me-1" />Organigrama</Nav.Link></Nav.Item>
            {employee.rrhhRole !== 'EMPLEADO' && (
              <Nav.Item><Nav.Link eventKey="fichajes"><ClockHistory className="me-1" />Control de fichajes</Nav.Link></Nav.Item>
            )}
            {puedeGestionar && (
              <Nav.Item><Nav.Link eventKey="estructura"><Building className="me-1" />Centros y departamentos</Nav.Link></Nav.Item>
            )}
            {puedeGestionar && (
              <Nav.Item><Nav.Link eventKey="actividad"><ListUl className="me-1" />Actividad</Nav.Link></Nav.Item>
            )}
          </Nav>

          {vista === 'plantilla' && (
            <Card>
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <Card.Title className="mb-0">Plantilla ({empleadosFiltrados.length}{buscar.trim() ? ` de ${empleados.length}` : ''})</Card.Title>
                  <div className="d-flex align-items-center gap-2">
                    <div className="buscador-plantilla">
                      <Search className="buscador-icono" />
                      <input
                        className="form-control form-control-sm"
                        placeholder="Buscar por nombre, correo, puesto, centro…"
                        value={buscar}
                        onChange={(e) => setBuscar(e.target.value)}
                        aria-label="Buscar en la plantilla"
                      />
                      {buscar && <button type="button" className="buscador-limpiar" onClick={() => setBuscar('')} aria-label="Limpiar búsqueda">×</button>}
                    </div>
                    {puedeGestionar && empleados.length > 0 && (
                      <Button size="sm" variant="outline-secondary" onClick={exportarPlantilla}><Download className="me-1" /> CSV</Button>
                    )}
                  </div>
                </div>
                <DataTable model={tabla} allRows={empleadosFiltrados} rowKey={(e) => String(e.id)} empty={buscar.trim() ? 'Sin resultados para tu búsqueda.' : 'No hay empleados visibles.'} />
              </Card.Body>
            </Card>
          )}

          {vista === 'organigrama' && (
            <Card>
              <Card.Body className="p-4">
                <OrganigramaLienzo empleados={orgEmpleados} />
              </Card.Body>
            </Card>
          )}

          {vista === 'fichajes' && employee.rrhhRole !== 'EMPLEADO' && <PanelFichajes />}

          {vista === 'estructura' && puedeGestionar && (
            <EstructuraManager centros={centros} departamentos={departamentos} onChange={reload} />
          )}

          {vista === 'actividad' && puedeGestionar && <ActividadRrhh />}
        </>
      )}

      <Modal show={abierto} onHide={() => setAbierto(false)} size="xl" fullscreen="lg-down" centered backdrop="static">
        <Form onSubmit={onSubmit}>
          <Modal.Header closeButton>
            <Modal.Title className="h5">{editId == null ? 'Nuevo empleado' : 'Editar ficha'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {formError && <Alert variant="danger" className="py-2">⚠ {formError}</Alert>}
            {editId == null ? (
              <p className="text-secondary small">
                Se enlaza con un <strong>usuario que ya existe</strong> (por su correo). Si no existe, créalo antes en
                Usuarios.
              </p>
            ) : (
              <p className="text-secondary small">El correo/usuario no se cambia desde aquí.</p>
            )}
            <div className="row g-3">
              <div className="col-12">
                <Form.Label className="fw-medium mb-1" htmlFor="e-email">Correo del usuario</Form.Label>
                <Form.Control id="e-email" type="email" value={form.email} autoFocus={editId == null} required={editId == null}
                  disabled={editId != null}
                  onChange={(ev) => setForm({ ...form, email: ev.target.value })} placeholder="nombre@grupoyorga.com" />
              </div>
              <div className="col-7">
                <Form.Label className="fw-medium mb-1" htmlFor="e-name">Nombre completo</Form.Label>
                <Form.Control id="e-name" value={form.fullName} required autoFocus={editId != null}
                  onChange={(ev) => setForm({ ...form, fullName: ev.target.value })} placeholder="Ana García" />
              </div>
              <div className="col-5">
                <Form.Label className="fw-medium mb-1" htmlFor="e-role">Rol RRHH</Form.Label>
                <Form.Select id="e-role" value={form.rrhhRole} onChange={(ev) => setForm({ ...form, rrhhRole: ev.target.value as RrhhRole })}>
                  {RRHH_ROLES.map((r) => (
                    <option key={r} value={r}>{RRHH_ROLE_LABELS[r]}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-6">
                <Form.Label className="fw-medium mb-1" htmlFor="e-pos">Puesto (opcional)</Form.Label>
                <Form.Control id="e-pos" value={form.position} onChange={(ev) => setForm({ ...form, position: ev.target.value })} placeholder="Dependienta" />
              </div>
              <div className="col-6">
                <Form.Label className="fw-medium mb-1" htmlFor="e-birth">Nacimiento (opcional)</Form.Label>
                <Form.Control id="e-birth" type="date" value={form.birthDate} onChange={(ev) => setForm({ ...form, birthDate: ev.target.value })} />
                <Form.Check
                  id="e-hide-birth"
                  className="small mt-1"
                  label="Ocultar el cumpleaños al equipo"
                  checked={form.hideBirthday}
                  onChange={(ev) => setForm({ ...form, hideBirthday: ev.target.checked })}
                />
              </div>
              <div className="col-3">
                <Form.Label className="fw-medium mb-1" htmlFor="e-hrs">Jornada (h/sem)</Form.Label>
                <Form.Control id="e-hrs" type="number" min={0} step={0.5} value={form.weeklyHours}
                  onChange={(ev) => setForm({ ...form, weeklyHours: ev.target.value })} placeholder="40" />
              </div>
              <div className="col-3">
                <Form.Label className="fw-medium mb-1" htmlFor="e-vac">Vacac. (d/año)</Form.Label>
                <Form.Control id="e-vac" type="number" min={0} value={form.annualLeaveDays}
                  onChange={(ev) => setForm({ ...form, annualLeaveDays: ev.target.value })} placeholder="23" />
              </div>
              <div className="col-6">
                <Form.Label className="fw-medium mb-1" htmlFor="e-fichaje">Ficha desde</Form.Label>
                <Form.Control id="e-fichaje" type="date" value={form.fichajeDesde} onChange={(ev) => setForm({ ...form, fichajeDesde: ev.target.value })} />
                <div className="text-secondary small mt-1">Antes de esta fecha no se marca “falta fichar”. Por defecto, el día de alta.</div>
              </div>
              <div className="col-12 col-sm-4">
                <Form.Label className="fw-medium mb-1" htmlFor="e-mgr">Responsable</Form.Label>
                <Form.Select id="e-mgr" value={form.managerId} onChange={(ev) => setForm({ ...form, managerId: ev.target.value })}>
                  <option value="">— Sin responsable —</option>
                  {posiblesResponsables.map((e) => (
                    <option key={e.id} value={e.id}>{e.fullName}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-12 col-sm-4">
                <Form.Label className="fw-medium mb-1" htmlFor="e-center">Centro</Form.Label>
                <Form.Select id="e-center" value={form.centerId} onChange={(ev) => setForm({ ...form, centerId: ev.target.value })}>
                  <option value="">— Sin centro —</option>
                  {centros.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.brand})</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-12 col-sm-4">
                <Form.Label className="fw-medium mb-1" htmlFor="e-dept">Departamento</Form.Label>
                <Form.Select id="e-dept" value={form.departmentId} onChange={(ev) => setForm({ ...form, departmentId: ev.target.value })}>
                  <option value="">— Sin departamento —</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Form.Select>
              </div>

              {/* REQ-012 · Datos de empresa e identidad de ficha */}
              <div className="col-12">
                <hr className="my-1" />
                <div className="text-secondary small text-uppercase fw-semibold">Empresa e identidad de ficha</div>
              </div>
              <div className="col-12 col-sm-6 col-lg-4">
                <Form.Label className="fw-medium mb-1" htmlFor="e-company">Sociedad (empresa)</Form.Label>
                <Form.Select id="e-company" value={form.companyId} onChange={(ev) => setForm({ ...form, companyId: ev.target.value })}>
                  <option value="">— Sin empresa —</option>
                  {catalogos.empresas.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-6 col-sm-3 col-lg-2">
                <Form.Label className="fw-medium mb-1" htmlFor="e-code">Cód. empleado</Form.Label>
                <Form.Control id="e-code" value={form.employeeCode} onChange={(ev) => setForm({ ...form, employeeCode: ev.target.value })} placeholder="105" />
              </div>
              <div className="col-6 col-sm-3 col-lg-3">
                <Form.Label className="fw-medium mb-1" htmlFor="e-dni">DNI</Form.Label>
                <Form.Control id="e-dni" value={form.dni} onChange={(ev) => setForm({ ...form, dni: ev.target.value })} placeholder="00000000A" />
              </div>
              <div className="col-12 col-sm-6 col-lg-3">
                <Form.Label className="fw-medium mb-1" htmlFor="e-antig">Antigüedad</Form.Label>
                <Form.Control id="e-antig" type="date" value={form.fechaAntiguedad} onChange={(ev) => setForm({ ...form, fechaAntiguedad: ev.target.value })} />
              </div>
              <div className="col-12 col-sm-4">
                <Form.Label className="fw-medium mb-1" htmlFor="e-cat">Categoría</Form.Label>
                <Form.Select id="e-cat" value={form.categoriaId} onChange={(ev) => setForm({ ...form, categoriaId: ev.target.value })}>
                  <option value="">— Sin categoría —</option>
                  {catalogos.categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-12 col-sm-4">
                <Form.Label className="fw-medium mb-1" htmlFor="e-contract">Tipo de contrato</Form.Label>
                <Form.Select id="e-contract" value={form.contractTypeId} onChange={(ev) => setForm({ ...form, contractTypeId: ev.target.value })}>
                  <option value="">— Sin contrato —</option>
                  {catalogos.contratos.map((c) => (
                    <option key={c.id} value={c.id}>{c.name ? `${c.name} (${c.code})` : c.code}</option>
                  ))}
                </Form.Select>
              </div>
              <div className="col-12 col-sm-4">
                <Form.Label className="fw-medium mb-1" htmlFor="e-seccion">Sección</Form.Label>
                <Form.Select id="e-seccion" value={form.seccionId} onChange={(ev) => setForm({ ...form, seccionId: ev.target.value })}>
                  <option value="">— Sin sección —</option>
                  {catalogos.secciones.map((c) => (
                    <option key={c.id} value={c.id}>{c.name ? `${c.name} (${c.code})` : c.code}</option>
                  ))}
                </Form.Select>
              </div>

              {/* REQ-012 · Permisos efectivos por convenio (solo lectura), al editar */}
              {editId != null && (
                <div className="col-12">
                  <hr className="my-1" />
                  <div className="text-secondary small text-uppercase fw-semibold mb-2">Permisos por convenio</div>
                  {permisosCargando ? (
                    <div className="text-secondary small"><Spinner as="span" size="sm" animation="border" /> Cargando permisos…</div>
                  ) : !permisos ? (
                    <div className="text-secondary small">No se pudieron cargar los permisos.</div>
                  ) : (
                    <>
                      <div className="small mb-2">
                        Zona: <strong>{permisos.zona?.name ?? '—'}</strong> · Convenio: <strong>{permisos.convenio?.name ?? '—'}</strong>{' '}
                        <Badge bg={permisos.fuente === 'convenio' ? 'success-subtle' : 'secondary-subtle'} text={permisos.fuente === 'convenio' ? 'success' : 'secondary'}>
                          {permisos.fuente === 'convenio' ? 'según convenio' : 'catálogo global'}
                        </Badge>
                      </div>
                      <div className="d-flex flex-wrap gap-2">
                        {permisos.permisos.map((p) => (
                          <Badge key={p.absenceTypeId} bg="light" text="dark" className="border">
                            {p.name}
                            {p.diasMax != null && <span className="text-secondary"> · {p.diasMax}d</span>}
                            {p.remunerado != null && <span className="text-secondary"> · {p.remunerado ? 'remun.' : 'no remun.'}</span>}
                          </Badge>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setAbierto(false)} disabled={saving}>Cancelar</Button>
            <Button type="submit" className="btn-brand" disabled={saving}>
              {saving ? <Spinner as="span" size="sm" animation="border" /> : editId == null ? 'Dar de alta' : 'Guardar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {importFichas && (
        <ImportFichasModal
          onClose={() => setImportFichas(false)}
          onImported={() => reload()}
        />
      )}
    </div>
  );
}
