import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DestinationDto } from '@yorga/contracts';
import { DestinosPage } from '../src/ui/pages/DestinosPage';

const VALENCIA: DestinationDto = {
  id: 1,
  code: 'VALENCIA',
  name: 'Valencia / tiendas',
  variant: 'CODE128_EAN',
  importadoPor: 'VANYOR S.A.U',
  active: true,
};
const USA: DestinationDto = {
  id: 2,
  code: 'USA',
  name: 'USA',
  variant: 'UPC_EAN',
  importadoPor: 'COOLWAY USA LLC',
  active: true,
};

const list = vi.fn();
const create = vi.fn();
const update = vi.fn();
vi.mock('../src/ui/composition', () => ({
  destinosGateway: {
    list: (...a: unknown[]) => list(...a),
    create: (...a: unknown[]) => create(...a),
    update: (...a: unknown[]) => update(...a),
  },
}));

async function pintar() {
  list.mockResolvedValue([VALENCIA, USA]);
  render(<DestinosPage />);
  await screen.findByText('Valencia / tiendas');
}

/** El modal abierto: se busca dentro de él para no confundirlo con la tabla de detrás. */
const modal = () => within(screen.getByRole('dialog'));

beforeEach(() => {
  list.mockReset();
  create.mockReset();
  update.mockReset();
});

describe('DestinosPage · el formulario vive detrás de un botón', () => {
  it('no se ve hasta pulsar "Nuevo destino"', async () => {
    await pintar();
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /nuevo destino/i }));
    expect(modal().getByText('Nuevo destino')).toBeTruthy();
  });

  it('el alta empieza en blanco', async () => {
    await pintar();
    await userEvent.click(screen.getByRole('button', { name: /nuevo destino/i }));
    expect((modal().getByLabelText('Código') as HTMLInputElement).value).toBe('');
    expect((modal().getByLabelText('Nombre') as HTMLInputElement).value).toBe('');
  });
});

describe('DestinosPage · editar carga EL destino de esa fila', () => {
  it('trae los datos de la fila pulsada, no los de otra', async () => {
    // Éste es el fallo que no se vería: un formulario con datos de otro destino no parece roto,
    // parece normal — y guardaría encima del equivocado.
    await pintar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar USA' }));

    expect((modal().getByLabelText('Código') as HTMLInputElement).value).toBe('USA');
    expect((modal().getByLabelText('Nombre') as HTMLInputElement).value).toBe('USA');
    expect((modal().getByLabelText('Importado por') as HTMLInputElement).value).toBe('COOLWAY USA LLC');
  });

  it('marca los checkboxes de los códigos que ese destino ya imprime', async () => {
    await pintar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar VALENCIA' }));

    // VALENCIA es CODE128_EAN: CODE128 y EAN marcados, UPC no.
    expect((modal().getByLabelText('CODE128') as HTMLInputElement).checked).toBe(true);
    expect((modal().getByLabelText('EAN') as HTMLInputElement).checked).toBe(true);
    expect((modal().getByLabelText('UPC') as HTMLInputElement).checked).toBe(false);
  });

  it('el código no se puede cambiar: es la identidad del destino', async () => {
    await pintar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar USA' }));
    expect((modal().getByLabelText('Código') as HTMLInputElement).disabled).toBe(true);
  });

  it('guarda la variante recompuesta de los checkboxes', async () => {
    await pintar();
    update.mockResolvedValue({ ...USA, variant: 'CODE128_UPC_EAN' });
    await userEvent.click(screen.getByRole('button', { name: 'Editar USA' }));
    await userEvent.click(modal().getByLabelText('CODE128')); // USA pasa de UPC+EAN a los tres
    await userEvent.click(modal().getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(2, {
        name: 'USA',
        importadoPor: 'COOLWAY USA LLC',
        variant: 'CODE128_UPC_EAN',
      }),
    );
  });

  it('cancelar no guarda nada', async () => {
    await pintar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar USA' }));
    await userEvent.click(modal().getByRole('button', { name: /cancelar/i }));

    expect(update).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('tras editar uno, el alta vuelve a estar en blanco (no arrastra lo anterior)', async () => {
    await pintar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar USA' }));
    await userEvent.click(modal().getByRole('button', { name: /cancelar/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await userEvent.click(screen.getByRole('button', { name: /nuevo destino/i }));
    expect((modal().getByLabelText('Código') as HTMLInputElement).value).toBe('');
  });
});

describe('DestinosPage · una etiqueta sin códigos no es una etiqueta', () => {
  it('sin ningún código marcado no se puede guardar, y se dice por qué', async () => {
    await pintar();
    await userEvent.click(screen.getByRole('button', { name: 'Editar VALENCIA' }));
    await userEvent.click(modal().getByLabelText('CODE128'));
    await userEvent.click(modal().getByLabelText('EAN'));

    expect(modal().getByText(/marca al menos uno/i)).toBeTruthy();
    expect((modal().getByRole('button', { name: /guardar cambios/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('DestinosPage · si la API falla al guardar', () => {
  it('el modal se queda abierto con lo escrito, y dice qué ha pasado', async () => {
    // Cerrarlo obligaría a teclearlo todo otra vez, y el motivo del rechazo se perdería.
    await pintar();
    create.mockRejectedValue(new Error('Ya existe un destino con el código "USA".'));

    await userEvent.click(screen.getByRole('button', { name: /nuevo destino/i }));
    await userEvent.type(modal().getByLabelText('Código'), 'USA');
    await userEvent.type(modal().getByLabelText('Nombre'), 'Otra vez USA');
    await userEvent.type(modal().getByLabelText('Importado por'), 'X');
    await userEvent.click(modal().getByRole('button', { name: /crear destino/i }));

    expect(await modal().findByText(/ya existe un destino con el código "usa"/i)).toBeTruthy();
    expect((modal().getByLabelText('Nombre') as HTMLInputElement).value).toBe('Otra vez USA');
  });
});
