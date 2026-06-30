export interface DownloadableFile {
  fileName: string;
  base64: string;
}

/** Puerto de salida: descargar ficheros recibidos en base64 (uno o en ZIP). */
export interface FileDownloader {
  download(fileName: string, base64: string): void;
  downloadZip(files: DownloadableFile[], zipName: string): Promise<void>;
}
