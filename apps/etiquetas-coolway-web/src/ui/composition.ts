import { HttpLabelsGateway } from '../infrastructure/http-labels-gateway';
import { BrowserFileDownloader } from '../infrastructure/browser-file-downloader';
import { HttpMaestroGateway } from '../infrastructure/http-maestro-gateway';

/** Raíz de composición: instancia los adapters concretos para los puertos. */
export const gateway = new HttpLabelsGateway();
export const downloader = new BrowserFileDownloader();
export const maestroGateway = new HttpMaestroGateway();
