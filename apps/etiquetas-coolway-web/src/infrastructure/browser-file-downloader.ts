import type { FileDownloader } from '../application/ports/file-downloader.port';

/** Adapter: descarga en el navegador un Excel recibido en base64. */
export class BrowserFileDownloader implements FileDownloader {
  download(fileName: string, base64: string): void {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }
}
