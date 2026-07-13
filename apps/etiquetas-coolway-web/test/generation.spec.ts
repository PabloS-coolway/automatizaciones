import { describe, expect, it, vi } from 'vitest';
import { validateGenerationInput } from '../src/domain/generation';
import { ValidationError, downloadAll, downloadFile, generateLabels, loadMarkets } from '../src/application/use-cases/labels.use-cases';
import type { LabelsGateway } from '../src/application/ports/labels-gateway.port';
import type { FileDownloader } from '../src/application/ports/file-downloader.port';

const pdf = new File(['x'], 'pedido.pdf');
const xlsx = new File(['x'], 'maestro.xlsx');

describe('validateGenerationInput · reglas del formulario', () => {
  it('exige al menos un PDF de pedido', () => {
    expect(validateGenerationInput({ masterSource: 'db', master: null, orders: [] })).toContain(
      'Sube al menos un PDF de pedido de compra.',
    );
  });

  it('con maestro = fichero, exige el Excel', () => {
    const errores = validateGenerationInput({ masterSource: 'file', master: null, orders: [pdf] });
    expect(errores).toHaveLength(1);
    expect(errores[0]).toMatch(/Excel maestro/);
  });

  it('con maestro = base de datos NO exige Excel', () => {
    expect(validateGenerationInput({ masterSource: 'db', master: null, orders: [pdf] })).toEqual([]);
  });

  it('entrada completa: sin errores', () => {
    expect(validateGenerationInput({ masterSource: 'file', master: xlsx, orders: [pdf] })).toEqual([]);
  });
});

describe('casos de uso del front', () => {
  const gateway = (): LabelsGateway => ({
    getMarkets: vi.fn().mockResolvedValue([{ code: 'USA' }]),
    generate: vi.fn().mockResolvedValue({ files: [] }),
  }) as unknown as LabelsGateway;

  it('generateLabels NO llama a la API si la entrada es inválida (falla antes, con los errores)', async () => {
    const g = gateway();
    expect(() => generateLabels(g, { masterSource: 'file', master: null, orders: [] })).toThrow(ValidationError);
    expect(g.generate).not.toHaveBeenCalled();
  });

  it('generateLabels pasa la entrada al gateway cuando es válida', async () => {
    const g = gateway();
    await generateLabels(g, { masterSource: 'db', master: null, orders: [pdf], market: 'USA' });
    expect(g.generate).toHaveBeenCalledWith(expect.objectContaining({ masterSource: 'db', market: 'USA' }));
  });

  it('loadMarkets delega en el gateway', async () => {
    const g = gateway();
    await expect(loadMarkets(g)).resolves.toEqual([{ code: 'USA' }]);
  });

  it('downloadFile y downloadAll delegan en el descargador', async () => {
    const downloader: FileDownloader = { download: vi.fn(), downloadZip: vi.fn().mockResolvedValue(undefined) };
    const file = { fileName: 'e.xlsx', fileBase64: 'AAA' } as never;

    downloadFile(downloader, file);
    expect(downloader.download).toHaveBeenCalledWith('e.xlsx', 'AAA');

    await downloadAll(downloader, [file]);
    expect(downloader.downloadZip).toHaveBeenCalledWith([{ fileName: 'e.xlsx', base64: 'AAA' }], 'etiquetas.zip');
  });
});
