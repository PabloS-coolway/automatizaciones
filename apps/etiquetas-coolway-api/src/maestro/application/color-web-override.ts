/**
 * REQ-009 · Regla que decide si el seed debe ESCRIBIR el "color web" de una fila existente.
 *
 * No se negocia: si la fila tiene el color web **editado a mano** (`manual`), NO se pisa — su dueño
 * pasó a ser la web, no el Excel. Si no está editado, se escribe el valor del Excel **sólo si viene**
 * (un vacío del Excel significa "no lo sé", no "bórralo": conserva lo que hubiera).
 *
 * Es una función pura a propósito: es EL punto donde la reimportación podría "mentir" (pisar en
 * silencio una edición), así que vive testeada aparte del adaptador de Prisma.
 */
export function colorWebParaSeed(excelValue: string | undefined, manual: boolean): { set: boolean; value?: string } {
  if (manual) return { set: false };
  if (excelValue) return { set: true, value: excelValue };
  return { set: false };
}
