import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Alert, Badge, Button, Card, Form, Spinner, Table } from 'react-bootstrap';
import { KeyFill, PersonPlus } from 'react-bootstrap-icons';
import type { Role, UserDto } from '@yorga/contracts';
import { usersGateway } from '../composition';
import { useAuth } from '../auth/AuthContext';

export function UsuariosPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  // Alta
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('operador');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    usersGateway
      .list()
      .then(setUsers)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setCreating(true);
    try {
      const u = await usersGateway.create({ email, name, password, role });
      setNotice(`Usuario ${u.email} creado.`);
      setEmail('');
      setName('');
      setPassword('');
      setRole('operador');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function patch(id: number, data: { role?: Role; active?: boolean; password?: string }, ok: string) {
    setError('');
    setNotice('');
    setBusyId(id);
    try {
      await usersGateway.update(id, data);
      setNotice(ok);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  function resetPassword(u: UserDto) {
    const pwd = window.prompt(`Nueva contraseña para ${u.email} (mínimo 6 caracteres):`);
    if (pwd == null) return;
    if (pwd.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    patch(u.id, { password: pwd }, `Contraseña de ${u.email} actualizada.`);
  }

  return (
    <div className="page page-wide">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">Usuarios</h1>
        <p className="text-secondary mb-0">Da de alta y gestiona quién accede a la herramienta.</p>
      </header>

      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>⚠ {error}</Alert>}
      {notice && <Alert variant="success" onClose={() => setNotice('')} dismissible>{notice}</Alert>}

      <Card className="mb-4">
        <Card.Body className="p-4">
          <Card.Title className="mb-3">Nuevo usuario</Card.Title>
          <Form onSubmit={onCreate}>
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <Form.Label className="small">Nombre</Form.Label>
                <Form.Control value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="col-md-3">
                <Form.Label className="small">Email</Form.Label>
                <Form.Control type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="col-md-3">
                <Form.Label className="small">Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="col-md-2">
                <Form.Label className="small">Rol</Form.Label>
                <Form.Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                  <option value="operador">operador</option>
                  <option value="admin">admin</option>
                </Form.Select>
              </div>
              <div className="col-md-1">
                <Button type="submit" className="btn-brand w-100" disabled={creating} title="Crear usuario">
                  {creating ? <Spinner as="span" size="sm" animation="border" /> : <PersonPlus />}
                </Button>
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <Card.Title className="mb-0">Usuarios ({users.length})</Card.Title>
            {loading && <Spinner as="span" size="sm" animation="border" />}
          </div>
          <div className="labels-preview">
            <Table size="sm" striped hover responsive className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>nombre</th>
                  <th>email</th>
                  <th>rol</th>
                  <th>estado</th>
                  <th className="text-end">acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isMe = u.id === me?.id;
                  const busy = busyId === u.id;
                  return (
                    <tr key={u.id}>
                      <td>
                        {u.name} {isMe && <span className="text-secondary small">(tú)</span>}
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <Badge bg={u.role === 'admin' ? 'primary' : 'secondary'}>{u.role}</Badge>
                      </td>
                      <td>
                        {u.active ? (
                          <Badge bg="success-subtle" text="success">activo</Badge>
                        ) : (
                          <Badge bg="secondary-subtle" text="secondary">inactivo</Badge>
                        )}
                      </td>
                      <td className="text-end">
                        <div className="d-inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={busy || isMe}
                            title={isMe ? 'No puedes cambiar tu propio rol' : 'Cambiar rol'}
                            onClick={() =>
                              patch(
                                u.id,
                                { role: u.role === 'admin' ? 'operador' : 'admin' },
                                `${u.email} ahora es ${u.role === 'admin' ? 'operador' : 'admin'}.`,
                              )
                            }
                          >
                            {u.role === 'admin' ? 'hacer operador' : 'hacer admin'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={busy}
                            title="Resetear contraseña"
                            onClick={() => resetPassword(u)}
                          >
                            <KeyFill />
                          </Button>
                          <Button
                            size="sm"
                            variant={u.active ? 'outline-danger' : 'outline-success'}
                            disabled={busy || isMe}
                            title={isMe ? 'No puedes desactivarte' : u.active ? 'Desactivar' : 'Activar'}
                            onClick={() =>
                              patch(u.id, { active: !u.active }, `${u.email} ${u.active ? 'desactivado' : 'activado'}.`)
                            }
                          >
                            {u.active ? 'desactivar' : 'activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
