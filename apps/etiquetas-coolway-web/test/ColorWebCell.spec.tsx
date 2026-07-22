import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorWebCell } from '../src/ui/components/ColorWebCell';

const props = {
  value: 'ROJO' as string | null,
  options: ['ROJO', 'AZUL'],
  refCodigo: '7603298',
  color: 'RED',
};

const dialog = () => within(screen.getByRole('dialog'));

describe('ColorWebCell · REQ-009 (editar color web en un modal)', () => {
  it('muestra el valor y el formulario vive detrás de un botón (no hay modal hasta pulsarlo)', async () => {
    render(<ColorWebCell {...props} onSave={vi.fn()} />);
    expect(screen.getByText('ROJO')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /editar «color web» de 7603298 RED/i }));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('elegir un valor existente y guardar llama a onSave(valor, false) y cierra el modal', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ColorWebCell {...props} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: /editar «color web»/i }));
    await userEvent.selectOptions(dialog().getByLabelText('Elegir color web'), 'AZUL');
    await userEvent.click(dialog().getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('AZUL', false));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('con «valor nuevo» permite texto libre y guarda con nuevo=true', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ColorWebCell {...props} value={null} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: /editar «color web»/i }));
    await userEvent.click(dialog().getByLabelText(/valor nuevo/i));
    await userEvent.type(dialog().getByLabelText('Nuevo color web'), 'VERDE MENTA');
    await userEvent.click(dialog().getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('VERDE MENTA', true));
  });

  it('si onSave falla, enseña el error y el modal sigue abierto (no miente que guardó)', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('403: sin permiso para editar'));
    render(<ColorWebCell {...props} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: /editar «color web»/i }));
    await userEvent.selectOptions(dialog().getByLabelText('Elegir color web'), 'AZUL');
    await userEvent.click(dialog().getByRole('button', { name: /guardar/i }));

    expect(await dialog().findByText(/sin permiso/i)).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('cancelar cierra el modal sin guardar', async () => {
    const onSave = vi.fn();
    render(<ColorWebCell {...props} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: /editar «color web»/i }));
    await userEvent.click(dialog().getByRole('button', { name: /cancelar/i }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(onSave).not.toHaveBeenCalled();
  });
});
