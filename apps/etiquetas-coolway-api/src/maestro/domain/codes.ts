/** Fila tal cual viene de un export de prepedidos (EAN.xlsm o UPC.xlsm). */
export interface CodeRow {
  style: string; // MODELO
  color: string;
  ref: string;
  size: string;
  code: string; // EAN o UPC según el fichero
}

/** Referencia consolidada del maestro (una por ref+talla). */
export interface MasterReference {
  style: string;
  color: string;
  ref: string;
  size: string;
  sku: string;
  ean13?: string;
  upc?: string;
}

export interface MergeIssue {
  ref: string;
  size: string;
  reason: 'missing_upc' | 'missing_ean13' | 'invalid_ean13' | 'invalid_upc' | 'style_color_mismatch';
  detail?: string;
}

export interface MergeResult {
  references: MasterReference[];
  issues: MergeIssue[];
}

export const isValidEan13 = (v?: string) => !!v && /^[0-9]{13}$/.test(v);
export const isValidUpc = (v?: string) => !!v && /^[0-9]{12}$/.test(v);
export const buildSku = (ref: string, size: string) => `${ref}-${size}`;

const key = (ref: string, size: string) => `${ref}|${size}`;

/**
 * Bloque 1+2: une los exports de EAN y UPC por (ref, talla), calcula el SKU
 * y reporta incidencias (códigos sueltos, formatos inválidos, desajustes).
 * Solo entran al maestro las filas con al menos un código válido.
 */
export function mergeCodes(eanRows: CodeRow[], upcRows: CodeRow[]): MergeResult {
  const map = new Map<string, MasterReference>();

  const ensure = (r: CodeRow): MasterReference => {
    const k = key(r.ref, r.size);
    let ref = map.get(k);
    if (!ref) {
      ref = { style: r.style, color: r.color, ref: r.ref, size: r.size, sku: buildSku(r.ref, r.size) };
      map.set(k, ref);
    }
    return ref;
  };

  const issues: MergeIssue[] = [];

  for (const r of eanRows) ensure(r).ean13 = r.code;
  for (const r of upcRows) {
    const ref = ensure(r);
    ref.upc = r.code;
    if ((ref.style && r.style && ref.style !== r.style) || (ref.color && r.color && ref.color !== r.color)) {
      issues.push({ ref: r.ref, size: r.size, reason: 'style_color_mismatch', detail: `${ref.style}/${ref.color} vs ${r.style}/${r.color}` });
    }
  }

  for (const ref of map.values()) {
    if (!ref.ean13) issues.push({ ref: ref.ref, size: ref.size, reason: 'missing_ean13' });
    else if (!isValidEan13(ref.ean13)) issues.push({ ref: ref.ref, size: ref.size, reason: 'invalid_ean13', detail: ref.ean13 });
    if (!ref.upc) issues.push({ ref: ref.ref, size: ref.size, reason: 'missing_upc' });
    else if (!isValidUpc(ref.upc)) issues.push({ ref: ref.ref, size: ref.size, reason: 'invalid_upc', detail: ref.upc });
  }

  return { references: [...map.values()], issues };
}
