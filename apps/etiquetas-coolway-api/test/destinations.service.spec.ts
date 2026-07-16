import { DestinationsService } from '../src/destinos/application/destinations.service';
import { DestinationRepository } from '../src/destinos/application/ports';
import { Destination, InvalidDestinationError } from '../src/destinos/domain/destination';

const usa: Destination & { id: number } = {
  id: 2,
  code: 'USA',
  name: 'USA',
  variant: 'UPC_EAN',
  importadoPor: 'COOLWAY USA LLC',
  active: true,
};
const apagado: Destination & { id: number } = {
  id: 9,
  code: 'PERU',
  name: 'Perú',
  variant: 'EAN',
  importadoPor: 'Perú',
  active: false,
};

/** Repo en memoria: el servicio se prueba sin Postgres. */
function repoCon(filas: (Destination & { id: number })[]): DestinationRepository {
  return {
    findAll: jest.fn(async () => filas),
    findActive: jest.fn(async () => filas.filter((d) => d.active)),
    findByCode: jest.fn(async (code) => filas.find((d) => d.code === code) ?? null),
    findById: jest.fn(async (id) => filas.find((d) => d.id === id) ?? null),
    create: jest.fn(async (d) => ({ ...d, id: 99, active: true })),
    update: jest.fn(async (id, data) => ({ ...filas.find((d) => d.id === id)!, ...data })),
  };
}

describe('DestinationsService · resolve (lo que se usa al generar)', () => {
  it('devuelve la variante y el "importado por" del destino', async () => {
    const s = new DestinationsService(repoCon([usa]));
    await expect(s.resolve('USA')).resolves.toMatchObject({ variant: 'UPC_EAN', importadoPor: 'COOLWAY USA LLC' });
  });

  it('acepta el código en minúsculas (igual que antes de la BD)', async () => {
    const s = new DestinationsService(repoCon([usa]));
    await expect(s.resolve('usa')).resolves.toMatchObject({ code: 'USA' });
  });

  it('si el destino no existe, dice CUÁL falta y cuáles valen (no un error genérico)', async () => {
    const s = new DestinationsService(repoCon([usa]));
    await expect(s.resolve('MARTE')).rejects.toThrow(/desconocido: "MARTE".*Válidos: USA/s);
  });

  it('un destino DESACTIVADO no genera: se apagó por algo, y se dice claro', async () => {
    // El peor fallo posible sería que generara igual: saldrían etiquetas de un destino retirado
    // y nadie se enteraría hasta tenerlas impresas.
    const s = new DestinationsService(repoCon([usa, apagado]));
    await expect(s.resolve('PERU')).rejects.toThrow(/está desactivado/);
  });
});

describe('DestinationsService · listActive (el desplegable)', () => {
  it('no ofrece los desactivados', async () => {
    const s = new DestinationsService(repoCon([usa, apagado]));
    expect((await s.listActive()).map((d) => d.code)).toEqual(['USA']);
  });

  it('la pantalla de administración sí los ve todos', async () => {
    const s = new DestinationsService(repoCon([usa, apagado]));
    expect((await s.list()).map((d) => d.code)).toEqual(['USA', 'PERU']);
  });
});

describe('DestinationsService · create', () => {
  const alta = { code: 'JAPON', name: 'Japón', variant: 'EAN' as const, importadoPor: 'Cliente JP' };

  it('da de alta un destino nuevo, activo', async () => {
    const s = new DestinationsService(repoCon([usa]));
    await expect(s.create(alta)).resolves.toMatchObject({ code: 'JAPON', active: true });
  });

  it('rechaza un código repetido (el código es la identidad)', async () => {
    const s = new DestinationsService(repoCon([usa]));
    await expect(s.create({ ...alta, code: 'usa' })).rejects.toThrow(/Ya existe un destino con el código "USA"/);
  });
});

describe('DestinationsService · update', () => {
  it('cambia el nombre sin tocar lo demás', async () => {
    const repo = repoCon([usa]);
    await new DestinationsService(repo).update(2, { name: 'Estados Unidos' });
    expect(repo.update).toHaveBeenCalledWith(2, { name: 'Estados Unidos' });
  });

  it('desactiva (no borra)', async () => {
    const repo = repoCon([usa]);
    await new DestinationsService(repo).update(2, { active: false });
    expect(repo.update).toHaveBeenCalledWith(2, { active: false });
  });

  it('rechaza vaciar el "importado por": se imprime en la etiqueta', async () => {
    const s = new DestinationsService(repoCon([usa]));
    await expect(s.update(2, { importadoPor: '   ' })).rejects.toThrow(InvalidDestinationError);
  });

  it('rechaza una variante que el motor no sabe imprimir', async () => {
    const s = new DestinationsService(repoCon([usa]));
    await expect(s.update(2, { variant: 'UPC+EAN13' as never })).rejects.toThrow(/no existe/);
  });

  it('avisa si el destino no existe', async () => {
    const s = new DestinationsService(repoCon([usa]));
    await expect(s.update(404, { name: 'X' })).rejects.toThrow(/No existe el destino #404/);
  });
});
