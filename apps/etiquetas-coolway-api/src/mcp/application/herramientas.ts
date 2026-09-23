import { z } from 'zod';
import { ReferenceFiltersDto, VALOR_VACIO } from '@yorga/contracts';
import { FACET_COLUMNS_LECTURA } from '../../maestro/application/maestro-query.service';
import { LecturaMaestroPort } from './ports';

/**
 * Herramientas del MCP de LECTURA del maestro (para el agente de consulta del grupo, "Yorgi").
 *
 * Aquí sólo vive la lógica (qué se pregunta y qué se devuelve), sin el SDK de MCP: así se prueba con un
 * puerto falso. El cableado con el SDK y el HTTP está en `interface/http/mcp-http.ts`.
 *
 * ⚠️ Alcance cerrado: maestro de referencias, destinos y surtidos. NADA que escriba y NADA de RRHH,
 * usuarios, roles ni actividad. Hay un test que falla si alguien añade una herramienta fuera de la lista.
 */

/** Tope de filas por página en `buscar_referencias`. */
export const MAX_POR_PAGINA = 200;
/** Tope de filas de `skus_maestro`. Si el filtro devuelve más, se AVISA (nunca se recorta en silencio). */
export const MAX_SKUS = 20_000;

export const INSTRUCCIONES_SERVIDOR = [
  'Servidor de SOLO LECTURA del maestro de referencias de Coolway (Grupo Yorga): referencias/SKU con sus',
  'códigos de barras EAN13 y UPC, modelo (style), color, talla, temporada y color web; además, los destinos',
  'de etiquetado y los surtidos de poda.',
  '',
  'Reglas que no se negocian:',
  '- El maestro es la ÚNICA autoridad de códigos de barras. Los códigos NUNCA se inventan, ni se deducen, ni',
  '  se componen a partir de otros datos (ni de la ref, ni del SKU, ni de otra talla o color).',
  '- Lo que falte (una referencia que no está, un EAN o UPC vacío, un color web sin rellenar) se REPORTA',
  '  tal cual como ausente; nunca se rellena.',
  '- Si una respuesta dice que un listado supera el tope, no lo des por completo: afina el filtro.',
  '',
  'Pistas: empieza por `estadisticas_maestro` para ver el tamaño; usa `facetas` para conocer los valores',
  'exactos de modelo, color, talla, color web o temporada antes de filtrar; `buscar_referencias` pagina;',
  '`skus_maestro` devuelve la lista compacta completa para cruzarla en código (p.ej. con Shopify).',
].join('\n');

/** Una herramienta: nombre, descripción para el LLM, esquema de entrada (zod) y su ejecución. */
export interface HerramientaLectura {
  nombre: string;
  descripcion: string;
  esquema: z.ZodRawShape;
  ejecutar(args: Record<string, unknown>): Promise<unknown>;
}

const multivalor = (desc: string) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .describe(`${desc} Valor exacto o lista de valores (OR). "${VALOR_VACIO}" = celda vacía. Lista vacía = sin filtro.`);

const contieneTexto = (desc: string) => z.string().optional().describe(`${desc} (contiene, sin distinguir mayúsculas).`);

/** Filtros comunes sobre el maestro (los mismos que la pantalla del maestro, más temporada y "sin código"). */
const ESQUEMA_FILTROS = {
  texto: z.string().optional().describe('Búsqueda libre: contiene en ref, SKU, EAN13, UPC, modelo o color.'),
  style: multivalor('Modelo (style), p.ej. "GOAL". Usa `facetas` con columna style para ver los válidos.'),
  color: multivalor('Color SAP de la referencia.'),
  size: multivalor('Talla que se imprime, p.ej. "40".'),
  colorNameWeb: multivalor('Color web (nombre del color en la tienda online).'),
  season: multivalor('Temporada, p.ej. "SS26".'),
  ref: contieneTexto('Referencia SAP'),
  sku: contieneTexto('SKU'),
  ean13: contieneTexto('Código EAN13'),
  upc: contieneTexto('Código UPC'),
  sinEan: z.boolean().optional().describe('true = sólo filas SIN EAN13 (nulo o vacío).'),
  sinUpc: z.boolean().optional().describe('true = sólo filas SIN UPC (nulo o vacío). Ojo: el UPC sólo aplica a USA.'),
  sinColorWeb: z.boolean().optional().describe('true = sólo filas SIN color web.'),
};

const comoLista = (v: unknown): string[] | undefined => {
  if (v === undefined || v === null) return undefined;
  const lista = (Array.isArray(v) ? v : [v]).map(String).filter((s) => s !== '');
  return lista.length ? lista : undefined; // lista vacía = sin filtro (para un LLM, "[]" no significa "ninguno")
};

const comoTexto = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** Traduce los argumentos de una herramienta a los filtros del maestro (los mismos que usa la web). */
export function aFiltros(a: Record<string, unknown>): ReferenceFiltersDto {
  const colorNameWeb = comoLista(a.colorNameWeb);
  if (a.sinColorWeb === true && colorNameWeb) {
    throw new Error('No combines "sinColorWeb" con "colorNameWeb": o filtras por un color web o por los que no lo tienen.');
  }
  const f: ReferenceFiltersDto = {
    search: comoTexto(a.texto),
    style: comoLista(a.style),
    color: comoLista(a.color),
    size: comoLista(a.size),
    colorNameWeb: a.sinColorWeb === true ? [VALOR_VACIO] : colorNameWeb,
    season: comoLista(a.season),
    ref: comoTexto(a.ref),
    sku: comoTexto(a.sku),
    ean13: comoTexto(a.ean13),
    upc: comoTexto(a.upc),
    sinEan: a.sinEan === true ? true : undefined,
    sinUpc: a.sinUpc === true ? true : undefined,
  };
  // Fuera las claves vacías: el filtro que viaja es exactamente el que se pidió.
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as ReferenceFiltersDto;
}

const entero = (v: unknown, porDefecto: number, min: number, max: number): number => {
  const n = Math.trunc(Number(v));
  return Number.isFinite(n) && n >= min ? Math.min(n, max) : porDefecto;
};

/** Define las herramientas sobre un puerto de lectura. Lista CERRADA (ver test de alcance). */
export function definirHerramientas(lectura: LecturaMaestroPort): HerramientaLectura[] {
  return [
    {
      nombre: 'estadisticas_maestro',
      descripcion:
        'Totales del maestro de referencias: nº de referencias (filas SKU), modelos, temporadas, cuántas tienen o no EAN13, UPC y color web, y filas por modelo. Empieza por aquí.',
      esquema: {},
      async ejecutar() {
        const [st, sinEan, sinUpc, sinColorWeb, temporadas, coloresWeb] = await Promise.all([
          lectura.estadisticas(),
          lectura.contar({ sinEan: true }),
          lectura.contar({ sinUpc: true }),
          lectura.contar({ colorNameWeb: [VALOR_VACIO] }),
          lectura.facetas('season', {}),
          lectura.facetas('colorNameWeb', {}),
        ]);
        const sinTemporada = temporadas.values.find((v) => v.value === VALOR_VACIO)?.count ?? 0;
        return {
          referencias: st.total,
          modelos: st.models.length,
          conEan: st.total - sinEan,
          sinEan,
          conUpc: st.total - sinUpc,
          sinUpc,
          sinColorWeb,
          coloresWebDistintos: coloresWeb.values.filter((v) => v.value !== VALOR_VACIO).length,
          temporadas: temporadas.values.filter((v) => v.value !== VALOR_VACIO).map((v) => ({ temporada: v.value, filas: v.count })),
          sinTemporada,
          filasPorModelo: st.models.map((m) => ({ style: m.style, filas: m.count })),
        };
      },
    },
    {
      nombre: 'buscar_referencias',
      descripcion:
        `Busca filas del maestro (una por referencia+talla) con filtros opcionales y paginación. Devuelve { total, pagina, porPagina, paginas, filas } con style, color, ref, size, sku, ean13, upc, colorNameWeb y season. Máx ${MAX_POR_PAGINA} filas por página. Un EAN/UPC nulo significa que el maestro NO lo tiene: repórtalo, no lo deduzcas.`,
      esquema: {
        ...ESQUEMA_FILTROS,
        pagina: z.number().int().min(1).optional().describe('Página (desde 1). Por defecto 1.'),
        porPagina: z.number().int().min(1).max(MAX_POR_PAGINA).optional().describe(`Filas por página (1-${MAX_POR_PAGINA}). Por defecto 50.`),
      },
      async ejecutar(a) {
        const pagina = entero(a.pagina, 1, 1, Number.MAX_SAFE_INTEGER);
        const porPagina = entero(a.porPagina, 50, 1, MAX_POR_PAGINA);
        const r = await lectura.referencias(aFiltros(a), porPagina, (pagina - 1) * porPagina);
        return {
          total: r.total,
          totalMaestro: r.grandTotal,
          pagina,
          porPagina,
          paginas: Math.ceil(r.total / porPagina),
          filas: r.items.map((x) => ({
            style: x.style,
            color: x.color,
            ref: x.ref,
            size: x.size,
            sku: x.sku,
            ean13: x.ean13 ?? null,
            upc: x.upc ?? null,
            colorNameWeb: x.colorNameWeb ?? null,
            season: x.season ?? null,
          })),
        };
      },
    },
    {
      nombre: 'facetas',
      descripcion: `Valores distintos (con nº de filas) de una columna del maestro, con los demás filtros aplicados. Columnas permitidas: ${FACET_COLUMNS_LECTURA.join(', ')}. Útil para saber los valores exactos antes de filtrar.`,
      esquema: {
        columna: z.enum(FACET_COLUMNS_LECTURA).describe('Columna de la que listar los valores.'),
        ...ESQUEMA_FILTROS,
      },
      async ejecutar(a) {
        const columna = String(a.columna ?? '');
        const permitida = (FACET_COLUMNS_LECTURA as readonly string[]).includes(columna);
        // Lista blanca también aquí (no sólo en el esquema): agrupar por una columna arbitraria no es aceptable.
        if (!permitida) throw new Error(`Columna no permitida: "${columna}". Válidas: ${FACET_COLUMNS_LECTURA.join(', ')}.`);
        const r = await lectura.facetas(columna as (typeof FACET_COLUMNS_LECTURA)[number], aFiltros(a));
        return { columna, distintos: r.values.length, valores: r.values.map((v) => ({ valor: v.value, filas: v.count })) };
      },
    },
    {
      nombre: 'listar_destinos',
      descripcion:
        'Destinos de etiquetado (VALENCIA, USA…): código, nombre, variante de códigos que se imprimen (EAN, UPC, CODE128_EAN, UPC_EAN), "importado por" y si está activo.',
      esquema: { soloActivos: z.boolean().optional().describe('true = sólo los activos. Por defecto, todos.') },
      async ejecutar(a) {
        const todos = await lectura.destinos();
        const destinos = (a.soloActivos === true ? todos.filter((d) => d.active) : todos).map((d) => ({
          code: d.code,
          name: d.name,
          variant: d.variant,
          importadoPor: d.importadoPor,
          active: d.active,
        }));
        return { total: destinos.length, destinos };
      },
    },
    {
      nombre: 'listar_surtidos',
      descripcion: 'Catálogo de surtidos de poda: por cada grupo (prefijo de referencia), los códigos de surtido SAP (SURTD) que se conservan al podar.',
      esquema: { grupo: z.string().optional().describe('Filtra por un grupo concreto.') },
      async ejecutar(a) {
        const grupo = comoTexto(a.grupo);
        const surtidos = (await lectura.surtidos())
          .filter((s) => !grupo || s.grupo === grupo)
          .map((s) => ({ grupo: s.grupo, codigo: s.codigo }));
        return { total: surtidos.length, surtidos };
      },
    },
    {
      nombre: 'skus_maestro',
      descripcion: `Lista COMPACTA y COMPLETA (sin paginar, hasta ${MAX_SKUS.toLocaleString('es-ES')} filas) de las referencias del maestro, opcionalmente filtrada por temporada y/o modelo: { total, filas: [{ sku, ean13, upc, style, color, size, season }] }. Pensada para cruzar en código con Shopify. Si supera el tope da error: filtra por season o style.`,
      esquema: {
        season: multivalor('Temporada, p.ej. "SS26".'),
        style: multivalor('Modelo (style), p.ej. "GOAL".'),
      },
      async ejecutar(a) {
        const r = await lectura.skus(aFiltros({ season: a.season, style: a.style }), MAX_SKUS);
        if (!r.completo) {
          // Nunca se recorta en silencio: una lista a medias haría creer que faltan SKU que sí existen.
          throw new Error(
            `El filtro devuelve ${r.total} filas y el tope es ${MAX_SKUS}. No se devuelve una lista incompleta: filtra por season o style.`,
          );
        }
        return { total: r.total, filas: r.filas };
      },
    },
  ];
}
