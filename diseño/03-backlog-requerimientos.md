# 03 · Backlog de trabajo

> Cola de entrada. Tú me pasas trabajo aquí; yo lo gestiono y lo maduro.
> Ciclo de vida: **🆕 Nuevo → 🔍 En análisis (negocio+arquitectura) → 📐 Diseñado → 🛠 En implementación → ✅ Hecho**

## Los tres tipos de trabajo (y por qué se separan)

No todo lo que entra es un requerimiento. Se gestionan distinto, así que se nombran distinto:

| Prefijo | Qué es | ¿Ritual de diseño? | Dónde queda |
|---|---|---|---|
| **REQ** | **Valor de negocio nuevo.** Resuelve un dolor que hoy se sufre a mano. | **Sí** → `/nuevo-requerimiento`: negocio y arquitectura antes de escribir código (qué dato consume, qué produce, quién es su dueño). | `diseño/iniciativas/REQ-XXX-<slug>/diseño.md` + CHANGELOG |
| **MEJ** | **Mejora sobre algo que ya existe**: UX, rendimiento, ergonomía, DX. No cambia el dato, ni la fuente de verdad, ni quién lo posee. | **No.** Sería burocracia: no hay decisión de arquitectura que tomar. | Una línea aquí + CHANGELOG |
| **BUG** | **Algo que ya debía funcionar y no funciona.** | **No**, pero es **obligatorio** registrar: **síntoma**, **causa raíz** y **test de regresión**. | Una línea aquí + CHANGELOG |

**La regla del BUG que no se negocia:** antes de dar un arreglo por bueno, se **rompe el código a propósito**
y se comprueba que el test se pone en rojo. Un test que pasa igual con el bug es peor que no tenerlo: da
falsa seguridad.

> **La familia de bugs de este proyecto.** Los peores que hemos tenido comparten patrón: el sistema daba
> una **respuesta falsa con apariencia de correcta** — no fallaba, *mentía*. El parser que se comía 798 pares
> y aun así "cuadraba"; el filtro que habría mirado 100 filas de 5.736; el `qs` que devolvía la tabla vacía
> sin error. Cuando algo pueda devolver un resultado incompleto, **la pregunta no es "¿falla?", sino
> "¿cómo sabría yo que está mintiendo?"**.

## Tabla

| ID | Título | Área | Estado | Resumen |
|----|--------|------|--------|---------|
| REQ-001 | Creación de colección COOLWAY: BD maestra, ficheros SAP, plantillas y etiquetas | Catálogo | 🔍 En análisis | Epic de 4 sub-entregables (BD maestra → tarifas/surtidos → plantillas ventas → etiquetas) que hoy hace Silvia a mano puenteando Prepedidos/400, Access, SAP y Drive. Diseño: [`iniciativas/REQ-001-coleccion-coolway/`](iniciativas/REQ-001-coleccion-coolway/diseño.md) |
| REQ-002 | Tablas explorables: filtrar por columna y ordenar (como en Excel) | Catálogo (UX de la herramienta) | ✅ Hecho | Las tablas de la web (maestro, etiquetas generadas, avisos, usuarios) sólo se leen: no se pueden ordenar ni filtrar por columna. Quien viene de Excel espera hacerlo. Ojo: el maestro se pagina en servidor (5.736 SKU), así que filtrar en cliente daría resultados falsos. Diseño: [`iniciativas/REQ-002-tablas-filtro-orden/`](iniciativas/REQ-002-tablas-filtro-orden/diseño.md) |
| REQ-003 | Etiquetar **ropa, calcetines y bolsas**: el SKU tiene TRES tallas | Catálogo | 🔍 En análisis | El calzado usa una talla (36, 37…) para todo. Ropa/calcetines/bolsas usan **tres**: la que viene en el **PDF** (`TALLA SAP`: 31, C01), la que va al **código de barras** (`TALLA TIENDAS`: 11, 35) y la que se **imprime** (`SIZE`: S/M/L/XL, 36-38, U). La BD sólo guarda una, así que hoy **estos productos no se pueden etiquetar**. Diseño: [`iniciativas/REQ-003-tallas-ropa-calcetines-bolsas/`](iniciativas/REQ-003-tallas-ropa-calcetines-bolsas/diseño.md) |
| MEJ-001 | Base de datos: KPIs fijos, pestañas y barra de la tabla en una fila | Catálogo (UX) | ✅ Hecho | Los KPIs se pierden de vista al explorar 5.736 filas → **sticky**. Las cargas (maestro y códigos) tapaban lo que se usa a diario y el operador ni siquiera puede usarlas → **pestaña aparte, sólo admin**. El buscador y el botón de exportar caían uno debajo del otro → **una sola fila**, con el buscador ocupando el hueco libre. |
| BUG-001 | Un filtro con más de 20 valores dejaba la tabla vacía **sin error** | Catálogo | ✅ Hecho | **Síntoma:** al desmarcar un valor en `color web`, la tabla salía vacía. **Causa:** Express parsea la query con `qs`, cuyo `arrayLimit` es **20**: a partir de 21 valores devuelve un **objeto**, no un array. El parser lo convertía en la cadena `"[object Object]"`, que no coincide con nada → **0 filas, sin error**. Sólo se veía en `color web` (408 valores distintos). **Arreglo:** `arrayLimit` alto en `main.ts` + el parser acepta también la forma de objeto (para que no vuelva a fallar en silencio). **Test:** `query-filtros.spec.ts`. |
| BUG-002 | El desplegable del filtro se vaciaba al desmarcar un valor | Catálogo | ✅ Hecho | **Síntoma:** desmarcabas un valor y la lista quedaba vacía; había que cerrar el popover y volver a abrirlo. **Causa:** al cambiar un filtro se invalidaba la caché de facetas **entera**, incluida la de la columna que estabas editando — y las facetas sólo se piden al **abrir** el desplegable. **Arreglo:** se conservan las facetas de esa columna (se calculan ignorando su propio filtro, que es lo que te deja volver a marcar lo que desmarcaste) y sólo caducan las de las demás. **Test:** `useServerTable.spec.ts`. |

---

### Plantillas de entrada (copiar al añadir)

```
| REQ-00X | <título> | Stock/Catálogo/BI/Marketing/Ops | 🆕 Nuevo | <qué dolor resuelve, a quién> |
| MEJ-00X | <título> | <área> (UX/rendimiento/DX) | 🆕 Nuevo | <qué molesta hoy y cómo debería quedar> |
| BUG-00X | <título> | <área> | 🆕 Nuevo | **Síntoma:** … **Causa:** … **Arreglo:** … **Test:** … |
```
