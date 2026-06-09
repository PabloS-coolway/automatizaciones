/** Puerto de salida: descargar un fichero recibido en base64. */
export interface FileDownloader {
  download(fileName: string, base64: string): void;
}
