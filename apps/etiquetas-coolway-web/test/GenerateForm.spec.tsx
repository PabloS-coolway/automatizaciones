import { render, screen } from '@testing-library/react';
import type { MarketDto } from '@yorga/contracts';
import { GenerateForm } from '../src/ui/components/GenerateForm';

const mercados: MarketDto[] = [
  { code: 'USA', name: 'USA', variant: 'UPC_EAN', importadoPor: 'COOLWAY USA LLC' },
  { code: 'COSTA_RICA', name: 'Costa Rica', variant: 'EAN', importadoPor: 'Costa Rica' },
];

function pintar(markets: MarketDto[]) {
  render(<GenerateForm markets={markets} loading={false} onGenerate={() => {}} />);
  return screen.getByLabelText('Destino') as HTMLSelectElement;
}

describe('GenerateForm · el selector de Destino (REQ-004)', () => {
  it('muestra el nombre legible, no el código interno', () => {
    pintar(mercados);
    expect(screen.getByRole('option', { name: 'Costa Rica' })).toBeTruthy();
  });

  it('elige el primer destino que llega de la API', () => {
    // Antes se fijaba 'VALENCIA' a pelo. Ahora los destinos los gestiona un admin: si VALENCIA se
    // desactiva, el select se quedaría apuntando a un destino inexistente y el pedido fallaría al
    // generar — y el usuario no vería nada raro en pantalla hasta pulsar el botón.
    expect(pintar(mercados).value).toBe('USA');
  });

  it('no revienta mientras los destinos aún no han llegado', () => {
    expect(pintar([]).value).toBe('');
  });
});
