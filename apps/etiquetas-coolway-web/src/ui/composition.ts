import { HttpLabelsGateway } from '../infrastructure/http-labels-gateway';
import { BrowserFileDownloader } from '../infrastructure/browser-file-downloader';
import { HttpMaestroGateway } from '../infrastructure/http-maestro-gateway';
import { HttpAuthGateway } from '../infrastructure/http-auth-gateway';
import { HttpUsersGateway } from '../infrastructure/http-users-gateway';

/** Raíz de composición: instancia los adapters concretos para los puertos. */
export const gateway = new HttpLabelsGateway();
export const downloader = new BrowserFileDownloader();
export const maestroGateway = new HttpMaestroGateway();
export const authGateway = new HttpAuthGateway();
export const usersGateway = new HttpUsersGateway();
