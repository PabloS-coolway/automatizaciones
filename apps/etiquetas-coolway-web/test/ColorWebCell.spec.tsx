import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ColorWebCell } from '../src/ui/components/ColorWebCell';

describe('ColorWebCell · REQ-009 (editar color web inline)', () => {
  it('muestra el valor con un botón para editar', () => {
    render(<ColorWebCell value="ROJO" options={['ROJO', 'AZUL']} onSave={vi.fn()} />);
    expect(screen.getByText('ROJO')).toBeTruthy();
    expect(screen.getByRole('button', { name: /editar/i })).toBeTruthy();
  });

  it('elegir un valor existente y guardar llama a onSave(valor, false)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ColorWebCell value="ROJO" options={['ROJO', 'AZUL']} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.selectOptions(screen.getByLabelText('Elegir color web'), 'AZUL');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('AZUL', false));
  });

  it('con «valor nuevo» permite texto libre y guarda con nuevo=true', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ColorWebCell value={null} options={['ROJO']} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.click(screen.getByLabelText('valor nuevo'));
    await user.type(screen.getByLabelText('Nuevo color web'), 'VERDE MENTA');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('VERDE MENTA', true));
  });

  it('si onSave falla, enseña el error y NO cierra la edición (no miente que guardó)', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('403: sin permiso para editar'));
    render(<ColorWebCell value="ROJO" options={['ROJO', 'AZUL']} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: /editar/i }));
    await user.selectOptions(screen.getByLabelText('Elegir color web'), 'AZUL');
    await user.click(screen.getByRole('button', { name: /guardar/i }));

    expect(await screen.findByText(/sin permiso/i)).toBeTruthy();
    // sigue en modo edición: el desplegable continúa visible
    expect(screen.getByLabelText('Elegir color web')).toBeTruthy();
  });
});
