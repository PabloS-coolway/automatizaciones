import { Card } from 'react-bootstrap';
import { Tools } from 'react-bootstrap-icons';

/** Página placeholder para secciones futuras (fases 2-4 del proyecto). */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="page">
      <header className="page-head mb-4">
        <h1 className="h4 mb-1">{title}</h1>
        <p className="text-secondary mb-0">Esta sección todavía no está disponible.</p>
      </header>
      <Card>
        <Card.Body className="text-center text-secondary py-5">
          <Tools size={32} className="mb-3" style={{ color: 'var(--brand)' }} />
          <div className="fw-semibold">Próximamente</div>
          <div className="small">La iremos construyendo según avancemos con el proyecto.</div>
        </Card.Body>
      </Card>
    </div>
  );
}
