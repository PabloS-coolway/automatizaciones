import { Gender } from '../model/types';

/**
 * RN-04 · El género se deriva del prefijo de la referencia:
 * "76…" → chica (W) · "86…" → chico (M). Vale tanto para la ref SAP como para la ref YORGA.
 */
export function genderFromRef(ref: string): Gender {
  return ref.startsWith('86') ? 'M' : 'W';
}
