# REQ-002 · Tablas explorables: filtrar por columna y ordenar (como en Excel)

- Estado: ✅ Hecho (fases 1-4) · Fecha: 2026-07-13
- Área: Catálogo (UX de la herramienta de etiquetas)

## Problema de negocio

Silvia viene de trabajar **en Excel**, donde ordenar por una columna y filtrar por valores es un gesto
reflejo. En la herramienta, las tablas son **de sólo lectura**: no se pueden ordenar ni filtrar por
columna. Hoy, para responder a preguntas cotidianas —*"¿qué referencias de GOAL no tienen UPC?"*,
*"enséñame sólo la talla 42"*, *"¿qué etiquetas de este pedido salen sin código?"*— hay que buscar a ojo
o exportar a Excel, que es justo el trabajo manual que estamos eliminando.

**A quién duele:** Silvia (Coolway), y a cualquier futuro operador. No duele al negocio en euros: duele en
**confianza y adopción**. Una herramienta que no deja mirar el dato como Excel se percibe como un paso
atrás, por muy bien que genere las etiquetas.

**Importante:** esto es un requerimiento de **usabilidad**, no de dato. No cambia ninguna fuente de la
verdad, no produce dato nuevo y no toca SAP, Drive ni el maestro. Es la capa de CONSUMO.

## Sistemas afectados (entradas / salidas / dueño del dato)

| | |
|---|---|
| **Sistemas del mapa que toca** | Ninguno. Sólo la app `etiquetas-coolway` (web + API). |
| **Dato que consume** | El que ya se muestra: maestro de referencias (Postgres), etiquetas generadas (en memoria, del PDF + maestro), avisos de carga, usuarios. |
| **Dato que produce** | **Ninguno.** Es lectura pura. |
| **Dueño del dato** | Sin cambios: el maestro sigue siendo de la app (sólo ella escribe). |

**Las 4 familias de tabla que hay hoy:**

| Tabla | Dónde | Volumen | Origen de los datos |
|---|---|---|---|
| **Maestro de referencias** | `BaseDatosPage` | **5.736 SKU** | **Servidor, paginado** (`GET /api/maestro/references`, `take`≤500 + `skip`) |
| **Etiquetas de un pedido** | `LabelsTable` / `ResultsCard` | hasta ~450 filas (pedido 4603662: 448) | En memoria (respuesta de `/api/labels/generate`) |
| **Avisos de carga** (rechazadas, EAN compartidos) | `BaseDatosPage` | decenas | En memoria |
| **Usuarios** | `UsuariosPage` | unidades | En memoria |

## Encaje arquitectónico

Cae en la **capa de CONSUMO** (apps), dominio **Catálogo**. Respeta los principios: no duplica dato, no
crea una segunda fuente de verdad, no reescribe nada.

**La fricción real, y es la decisión importante del requerimiento:**

> El maestro **se pagina en el servidor**. Si el filtro y la ordenación se hacen **en el cliente**, sólo
> actuarían sobre las ~100 filas que hay cargadas en pantalla, no sobre las 5.736.

Eso produciría el peor fallo posible: **una respuesta falsa con apariencia de correcta**. Silvia filtraría
"GOAL sin UPC", vería 3 resultados y concluiría que sólo hay 3, cuando podría haber 70. Es exactamente el
mismo patrón del bug de los 798 pares que acabamos de corregir: **el sistema parecía cuadrar y mentía**.
Por eso, en el maestro, filtrar y ordenar **tienen que ir al servidor**.

Hoy el servidor sólo acepta un `search` global (busca en ref, sku, ean13, upc, style y color a la vez) y
ordena con un criterio **fijo** (`style, color, ref, size`). No hay filtro por columna ni orden elegible.

Las otras tres tablas caben enteras en memoria → ahí el cliente basta y sobra.

## Opciones y recomendación

### Opción A — Todo en cliente (una librería de tablas, p.ej. TanStack Table)
- ✅ Rápido, un solo patrón para las 4 tablas, sin tocar la API.
- ❌ **Mentiría en el maestro** salvo que nos traigamos los 5.736 SKU de golpe al navegador.
- ❌ Traerlos todos (~1-2 MB) tira la paginación por la borda y empeora con el catálogo futuro.

### Opción B — Servidor en el maestro, cliente en el resto ✅ **recomendada**
- API: `GET /api/maestro/references` acepta **filtros por columna** (modelo, color, ref, talla, con/sin
  EAN, con/sin UPC) y **`sort` + `dir`** sobre columnas permitidas (lista blanca → nada de inyectar
  `orderBy` arbitrario).
- Web: un **componente de tabla reutilizable** (cabecera clicable para ordenar + fila de filtros) que se
  usa en las 4 tablas. En el maestro delega en la API; en las demás ordena/filtra en memoria.
- ✅ El maestro dice la verdad, y escala cuando entren más marcas.
- ✅ Un único gesto de UI para el usuario, aunque por debajo haya dos motores.
- ❌ Más trabajo: toca API, contratos y web.

### Opción C — Exportar a Excel y que filtre allí
- ✅ Coste casi cero (ya serializamos Excel).
- ❌ **Es rendirse**: devuelve a Silvia al Excel manual, que es el problema que vinimos a resolver.
- Puede tener sentido *además* (exportar la vista filtrada), nunca *en lugar de*.

**Recomendación: opción B.** Y una decisión de producto que la refuerza: en el maestro, mostrar siempre
**"N de 5.736 filas"** con el filtro aplicado, para que nunca se confunda "lo que veo" con "lo que hay".

---

## ✅ Decisiones tomadas (Pablo, 2026-07-13)

1. **Opción B**, confirmada.
2. **Un único componente de tabla** (`DataTable`) usado en **todas** las tablas de la app. Nada de
   soluciones a medida por pantalla: el gesto debe ser el mismo en todas partes.
3. **Se hace el autofiltro de verdad** (casillas con los valores, como Excel), aunque cueste más. El
   objetivo explícito es **acortar la brecha entre "usar Excel" y "usar nuestra app"**: si la app se queda
   a medias, Silvia volverá al Excel.

### Cómo se filtra cada columna (lo decide la CARDINALIDAD, medida en la BD)

| Columna | Valores distintos | Tipo de filtro |
|---|---|---|
| talla | 21 | **Casillas** (autofiltro Excel) |
| modelo (style) | 74 | **Casillas** |
| color | 95 | **Casillas** |
| color web | 407 | **Casillas + buscador** dentro del desplegable |
| ref | 908 | **Casillas + buscador** (o texto "contiene") |
| sku · ean13 · upc | 5.736 · 5.480 · 2.319 | **Texto "contiene"** — son casi únicos: un desplegable con 5.736 casillas no lo usa nadie |
| *(derivado)* con/sin EAN, con/sin UPC | 2 | **Casilla booleana** — responde a *"¿qué no se puede etiquetar?"*, la pregunta real de Silvia |

> El usuario no ve esta distinción como una limitación: abre el filtro de una columna y aparece lo que
> tiene sentido para esa columna. Es lo que hace Excel.

### Cómo se comportan los filtros entre sí

Como en Excel: los valores que ofrece el desplegable de una columna **tienen en cuenta los filtros ya
aplicados en las demás**. Si filtras modelo = GOAL, el desplegable de color sólo ofrece los colores de
GOAL. En el maestro, esas listas de valores (*facetas*) las calcula el **servidor** — no se pueden deducir
de las 100 filas que hay en pantalla.

## Preguntas abiertas y riesgos

1. **¿Qué es "filtrar como Excel" para Silvia?** Hay dos cosas muy distintas:
   - (a) **caja de texto por columna** ("contiene GOAL") — simple, cubre el 90% de los casos;
   - (b) **desplegable con los valores distintos y casillas** (el autofiltro real de Excel) — más fiel,
     bastante más trabajo, y con 5.736 filas hay que traerse los valores distintos del servidor.
   Propongo empezar por (a), y (b) sólo en columnas de pocos valores (talla, color, modelo).
2. **¿Qué tablas le importan de verdad?** Sospecho que el maestro y las etiquetas del pedido; usuarios y
   avisos son casi anecdóticos. Conviene no construir de más.
3. **¿Hace falta exportar la vista filtrada a Excel?** Es barato y probablemente lo pida en cuanto vea
   que puede filtrar.
4. **Riesgo (el gordo): filtrar en cliente sobre datos paginados miente.** Mitigación: en el maestro,
   servidor siempre; y enseñar el contador "N de M".
5. **Riesgo menor:** rendimiento en la tabla de etiquetas (~450 filas). Es asumible en memoria; si algún
   pedido crece mucho, se paginaría también.

## Arquitectura del componente unificado

**Una tabla, dos motores.** El componente es el mismo en todas partes; lo que cambia es de dónde salen
los datos filtrados. Esto se resuelve con un **puerto** (coherente con la hexagonal de la web):

```
        ┌──────────────────────────────┐
        │   DataTable (UI: cabeceras     │   ← un solo componente, un solo gesto
        │   ordenables + autofiltros)    │
        └──────────────┬───────────────┘
                       │ TableDataSource (puerto)
          ┌────────────┴────────────┐
          │                         │
   ServerDataSource          MemoryDataSource
   (maestro: 5.736 SKU,      (etiquetas, avisos, usuarios:
    filtra/ordena la BD)      caben en memoria)
```

- **`MemoryDataSource`**: filtra y ordena el array que ya tiene el navegador. Las facetas (valores
  distintos) se calculan de los propios datos.
- **`ServerDataSource`**: traduce filtros/orden a query params y llama a la API. Las facetas las pide al
  servidor.

Así, si mañana la tabla de etiquetas creciera y hubiera que paginarla, se cambia el *data source* y **el
componente y la UI no se tocan**.

### Contrato de API (maestro)

- `GET /api/maestro/references` — añade:
  - filtros por columna: `style`, `color`, `size`, `colorWeb` (multivalor), `ref`/`sku`/`ean13`/`upc`
    (contiene), `hasEan`/`hasUpc` (booleanos);
  - `sort` + `dir`, sobre una **lista blanca de columnas** (nunca un `orderBy` que venga del cliente:
    sería inyectable).
- `GET /api/maestro/facets?column=<col>` — valores distintos de esa columna **con los demás filtros ya
  aplicados** (como Excel), y su recuento.
- Se mantiene el `search` global que ya existe (búsqueda rápida transversal). No se rompe nada.

## Plan de implementación (por fases, cada una entregable)

| Fase | Qué | Por qué en este orden |
|---|---|---|
| **1** | `DataTable` + `MemoryDataSource`: ordenar y filtrar por columna en **etiquetas, avisos y usuarios** | Valor visible ya, sin tocar la API. Valida la UI con Silvia antes de invertir en el back |
| **2** | API del maestro: filtros por columna + `sort`/`dir` + `facets` | La parte de fondo, con tests |
| **3** | `ServerDataSource` y enchufar el maestro al mismo `DataTable` | El maestro deja de mentir: filtra sobre los 5.736, no sobre 100 |
| **4** | *(opcional)* Exportar a Excel **la vista filtrada** | Cuando Silvia pueda filtrar, lo va a pedir |

## Resultado (todas las fases entregadas)

| Fase | Estado | Qué quedó |
|---|---|---|
| **1** | ✅ | `DataTable` + `useMemoryTable` en etiquetas, faltantes, avisos y usuarios |
| **2** | ✅ | API del maestro: filtros por columna, `sort`/`dir` con **lista blanca**, `GET /maestro/facets` |
| **3** | ✅ | `useServerTable`: el maestro filtra en la BD. **La UI no cambió** — sólo el motor |
| **4** | ✅ | `GET /maestro/export`: Excel de la vista filtrada, generado en el servidor |

**Lo que se confirmó por el camino:**
- La decisión de **no** filtrar el maestro en cliente era la correcta: son 100 filas de 5.736 en pantalla.
- **La lista blanca de ordenación era seguridad**, no cosmética: `sort=id;DROP TABLE reference` cae al orden
  por defecto en vez de llegar al `orderBy`.
- **Los códigos hay que exportarlos como texto celda a celda**: `exceljs` no guarda el formato de columna, y
  Excel habría convertido los EAN13 en notación científica. Lo cazó un test porque **reabre el fichero**.

**Aprendizaje para el siguiente REQ:** los dos bugs de la fase 1 (sticky roto, "(Seleccionar todo)" que no
desmarcaba) eran de **presentación**, y ninguna cobertura los habría cazado. Se cazan **probando la app**.

## Próximos pasos

- Enseñárselo a Silvia y ver si el gesto le vale (es lo que decide si esto sirve).
- Si pide filtrar por rangos (tallas 40-45) o guardar vistas, se registra como REQ nuevo.
