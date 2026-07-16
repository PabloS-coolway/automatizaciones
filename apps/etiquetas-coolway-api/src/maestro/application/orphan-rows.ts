import { RemovedRow, SeedRow } from './ports';

type FilaBd = { ref: string; size: string; style: string; color: string };

const claveRefTalla = (ref: string, size: string) => `${ref} ${size}`;
const claveProducto = (style: string, color: string) => `${style.toUpperCase()} ${color.toUpperCase()}`;

/**
 * Decide qué filas del maestro han quedado HUÉRFANAS al cargar el Excel: están en la BD pero ya no
 * en el Excel, **y su producto (modelo+color) sí viene en el Excel**.
 *
 * Por qué existe: la identidad de una fila es `(ref, talla)`. Si Silvia corrige una talla (p.ej. la
 * mochila pasa de `35` a `U`), la fila corregida es una NUEVA y la vieja se queda para siempre —y
 * encima gana al generar, porque ambas comparten la talla SAP. Resultado: corriges el Excel, recargas,
 * y la etiqueta sigue mal. No falla: miente.
 *
 * Por qué se acota al MISMO PRODUCTO, y no se borra todo lo que no venga en el Excel: porque un Excel
 * incompleto sería una catástrofe. Ya pasó — la hoja `GOAL` no se leía por una cabecera rota, y sus
 * 1.343 filas habrían desaparecido. Si un producto no viene en el Excel, no se toca: se asume que el
 * Excel no lo trae, no que se haya dado de baja.
 */
export function findOrphanRows(enBd: FilaBd[], enExcel: SeedRow[]): RemovedRow[] {
  const clavesExcel = new Set(enExcel.map((r) => claveRefTalla(r.ref, r.size)));
  const productosExcel = new Set(enExcel.map((r) => claveProducto(r.style, r.color)));

  return enBd
    .filter((f) => !clavesExcel.has(claveRefTalla(f.ref, f.size)))
    .filter((f) => productosExcel.has(claveProducto(f.style, f.color)))
    .map((f) => ({ style: f.style, color: f.color, ref: f.ref, size: f.size }));
}
