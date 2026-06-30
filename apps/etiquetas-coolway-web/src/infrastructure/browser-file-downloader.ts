import JSZip from 'jszip';
import type { DownloadableFile, FileDownloader } from '../application/ports/file-downloader.port';

/** Adapter: descarga en el navegador ficheros recibidos en base64 (uno suelto o un ZIP). */
export class BrowserFileDownloader implements FileDownloader {
  download(fileName: string, base64: string): void {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    this.save(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
  }

  async downloadZip(files: DownloadableFile[], zipName: string): Promise<void> {
    const zip = new JSZip();
    for (const f of files) zip.file(f.fileName, f.base64, { base64: true });
    const blob = await zip.generateAsync({ type: 'blob' });
    this.save(blob, zipName);
  }

  private save(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
