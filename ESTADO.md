# Estado del proyecto · dónde vamos y qué sigue

> Documento de traspaso. Si retomas el trabajo (o cambias de ordenador), **empieza por aquí**.
> Última actualización: **2026-07-30**. Historial detallado en [`CHANGELOG.md`](CHANGELOG.md).

## Arranque en un ordenador nuevo

```bash
git clone git@github-coolway:PabloS-coolway/automatizaciones.git
cd automatizaciones

cp apps/etiquetas-coolway-api/.env.example apps/etiquetas-coolway-api/.env
npm run setup                     # install + Postgres (Docker) + Prisma + migraciones

npx skills experimental_install    # ← IMPRESCINDIBLE: restaura los skills de Claude Code

npm run auth:create-user -- --email tu@email.com --password "…" --name "Tu nombre" --role admin
npm run dev                       # API :3000 + web :5173
```

**Sobre skills y comandos de Claude Code:**

| Qué | ¿Viaja en el repo? |
|---|---|
| Comando `/nuevo-requerimiento` (`.claude/commands/`) | ✅ Sí |
| `skills-lock.json` (qué skills y de dónde salen) | ✅ Sí |
| **Contenido** de los skills (`.claude/skills/`, `.agents/`) | ❌ No — está en `.gitignore` |

Por eso hace falta `npx skills experimental_install`: reinstala desde el lockfile los 4 skills del proyecto
(`frontend-a11y`, `javascript-typescript-jest`, `ux-usability-foundations`, `web-design-guidelines`).
Sin ese paso el proyecto funciona igual, pero Claude no tendrá esos skills disponibles.

Requisitos previos: Node 20+, npm 10+, **Docker** (Postgres) y `pdftotext` (paquete `poppler-utils`, para
leer los PDFs de SAP).

> No hace falta que te acuerdes: **`npm run setup` los comprueba** (preflight) y aborta diciéndote qué
> falta y cómo instalarlo. `pdftotext` es dependencia **de sistema**, no de npm: `sudo apt-get install -y poppler-utils`.

## Resumen en una línea

**REQ-001 Fase 1 (etiquetas) está terminada y validada con pedidos reales.** La Fase 2 (maestro en
base de datos) está operativa, con login y roles. Lo siguiente es el **Bloque 3: gobernanza del
maestro** (publicarlo a los departamentos) — y hay un **problema de calidad del maestro** que Silvia
tiene que corregir (ver abajo).

## Qué está hecho

### Fase 1 · Motor de etiquetas ✅
Genera el fichero de etiquetas de un pedido de compra SAP (PDF) usando el maestro de códigos.
**Validado end-to-end con pedidos reales de Silvia**, cuadre exacto. Reglas implementadas: RN-01
(búsqueda por modelo/color/talla/género), RN-02 (CODE128 = ref+00000+talla), RN-04 (género por
prefijo 76/86 de la ref SAP), RN-05 (UPC compartido entre géneros), RN-06 (dedupe por ref+talla).

### Fase 2 · Maestro en Postgres ✅ (Bloques 1 y 2)
El maestro de códigos vive en **Postgres** (fuente de verdad gobernada: sólo la app escribe).
- **Cargar maestro completo**: se sube `REFERENCIAS COOLWAY.xlsx` **desde la web** (Base de datos →
  *Cargar maestro completo*) o por CLI (`maestro:seed`). **5.736 SKU** con el maestro del 13/07/2026.
- **El EAN13 no es único** (migración `ean13_deja_de_ser_unico`): un producto re-referenciado en SAP
  conserva su código en la ref vieja y en la nueva. La identidad del SKU es `(ref, talla)`.
- **Un código vacío en el Excel NO borra el de la BD**: vacío = "no lo sé", no "bórralo" (el UPC sólo
  aplica a USA y a veces llega más tarde).
- **Actualizar códigos**: importa los exports de prepedidos `EAN.xlsm` + `UPC.xlsm` (une por ref+talla,
  calcula SKU, upsert idempotente, con informe).
- Al generar etiquetas se puede elegir el maestro **desde la BD o desde un Excel subido**.

### Acceso ✅
Login con JWT, usuarios en la misma Postgres (bcrypt). Roles **operador** / **admin**. El import y la
carga del maestro y la gestión de usuarios son sólo de admin. Pantalla de **Usuarios** para altas/bajas
sin CLI. El primer admin se crea con `npm run auth:create-user`.

## ⚠ Hallazgo pendiente de resolver con Silvia

**33 códigos EAN13 están asignados a DOS PRODUCTOS DISTINTOS** (modelo o color diferente). Ya no
bloquean la carga —las filas entran—, pero el mismo código de barras identificaría a dos productos que se
venden por separado: **en caja sería ambiguo**. La web los lista en cada carga del maestro.

| Productos que comparten EAN | EAN afectados |
|---|---|
| BECKS BUR vs BECKS RED | 13 |
| BECKS PUR vs BECKS WHT | 6 |
| KIZUNA FRS vs KIZUNA GHY | 6 |
| BECKS BUR vs BECKS DGY *(comparten además ref y talla: uno pisa al otro en la BD)* | 6 |
| GOAL BRW vs GOAL EXP | 1 |
| GOAL KAK vs GOAL NUD | 1 |

> No confundir con la **re-referenciación** (mismo modelo+color con dos refs, p.ej. `GOAL MIX`
> 7643409 ↔ 7673119): eso es legítimo, el EAN se conserva y la BD ya lo admite. Sólo se avisa de lo de
> arriba.

**Otros defectos del maestro** (asumidos, no bloquean):
- **6 EAN13 con texto** en vez de código (`"bl"`, `"ice green"`, `"vanill"`, `"pink"`, `"white leat"`, `"1"`)
  en DUCK, GOAL TAN y MILE → modelos antiguos. Las filas entran **sin EAN** (nunca se inventa).
- **210 filas sin EAN13** (GOAL 70, BLAKE MID 42, MILE 32, BECKS 30, BARESI 14, KIRO 9, 2003 7, DUCK 5,
  KIZUNA 1) → colección aún sin sacar. Entran y esperan código.
- **33 filas con (ref, talla) repetida** dentro del Excel (todas en `BECKS-BECKS X`) → duplicidad
  deprecada; la segunda fila pisa a la primera.

**Acción pendiente**: pasarle a Silvia los 33 EAN compartidos entre productos distintos.

### ✅ BACKPACK · resuelto (16/07)
Silvia corrigió el `SIZE` a `U` (maestro `validaciones/16-07-2026/REFERENCIAS COOLWAY_16_07_3.xlsx`) y
confirmó que **ese modelo NO tiene UPC** (es antiguo, nunca se creó): el aviso `missing_upc` del pedido de
USA (4602992) es correcto y **se ignora a propósito**. El pedido 4602991 (Valencia) sale 750/750 con talla
`U` y `CODE128 03082800000035`.

> Corregir esa talla destapó **BUG-004**: la fila vieja se quedaba en la BD y **ganaba** al generar, así que
> la corrección no surtía efecto. Ahora la carga del maestro **retira las huérfanas del mismo producto** y
> las reporta. Ojo con la salvaguarda: si un producto NO viene en el Excel (p.ej. una hoja que no se lee),
> no se toca nada suyo — evita repetir el susto de las 1.343 filas de GOAL.

## Cómo probarlo (qué fichero subir)

Los pedidos de prueba están en `docs/requerimientos/`. **El destino importa**, porque determina qué
códigos lleva la etiqueta: Valencia = CODE128+EAN · USA = UPC+EAN · Italia/UK/Costa Rica = sólo EAN.
Si eliges el destino equivocado, aparecerán "faltantes" que en realidad son correctos.

| Pedido | Destino | Qué prueba |
|---|---|---|
| `4603418.pdf` | **USA** | El más simple: 60 pares, 7 filas. **Empieza por este.** |
| `validaciones/4603552.pdf` | USA | 112 pares |
| `validaciones/Update Order 4603338.pdf` | Italia | Sólo EAN, 1.840 pares |
| `validaciones/UPDATE Order 4603187- (1).pdf` | **Valencia** | El gordo: cajas surtidas + CODE128, 8.444 pares, 265 filas |
| `validaciones/4603662.pdf` | USA | Cajas **monotalla** (`M36`…`M46`) y **colores compuestos** (`W-B`): 11.028 pares, 448 filas |
| `validaciones/4603661.pdf` | USA | Surtidos `D` / `CD` / `DE4`: 5.080 pares, 1.068 cajas. **0 faltantes** desde que se arregló el UPC de GOAL |
| `validaciones/14-07-2026/ORDER 4603015.pdf` | **Valencia** | **ROPA** (REQ-003): imprime `S/M/L/XL`, el CODE128 lleva `11-14`. 1.280 pares |
| `validaciones/14-07-2026/ORDER 4603016.pdf` | **USA** | La misma ropa con UPC+EAN. 1.220 pares |
| `validaciones/14-07-2026/4603670.pdf` | **Valencia** | **CALCETINES** (ZEBRA: imprime `36-38`, código `11`) + ropa. 1.000 pares |
| `validaciones/14-07-2026/4603671.pdf` | Valencia | Ropa (STORM). 200 pares |
| `validaciones/14-07-2026/4602991.pdf` | **Valencia** | **BOLSAS**: mochila. Imprime `U`, el CODE128 lleva `35` y la ref corta va con cero delante (`03082800000035`). 750 pares |
| `validaciones/14-07-2026/4602992.pdf` | USA | La misma mochila. Avisa `missing_upc` **a propósito**: ese modelo antiguo no tiene UPC (Silvia lo confirmó) |

**Maestro vigente**: `docs/requerimientos/validaciones/16-07-2026/REFERENCIAS COOLWAY_16_07_3.xlsx` (súbelo
como fichero, o cárgalo antes en la BD y elige *maestro = base de datos*).

**Para ver el aviso de fallos**: maestro `validaciones/MAESTRO_INCOMPLETO.xlsx` + pedido `4603434.pdf`
→ descuadre de 19 pares (NILO YEL tallas 40 y 41).

> ⚠ **No uses `EAN.xlsm`/`UPC.xlsm` como maestro para estos pedidos.** Son de otra gama de colores
> (NILO BLU, GOAL BGE…) y no cubren ningún pedido real: saldría todo como "no está en el maestro".

## Decisiones tomadas (y por qué)

- **Prisma + Postgres**, con el módulo del maestro dentro de `etiquetas-coolway-api` (se separará si crece).
- **Identidad en nuestra BD**, no SSO corporativo: la infraestructura del grupo aún no está mapeada.
  Si algún día se mapea (Google Workspace / M365), migrar a SSO es lo correcto: IT gestionaría altas y bajas.
- **Roles operador/admin**: lo que hay que proteger de verdad es la escritura del maestro.
- Formato de salida simplificado (lo que prefiere Silvia); los bultos se quedan en SAP.

### REQ-002 · Tablas explorables ✅ (COMPLETO: fases 1-4)
**Todas** las tablas se ordenan y filtran por columna con un componente único (`DataTable`), con autofiltro
tipo Excel y facetas cruzadas (los valores de un desplegable respetan los filtros de las demás columnas).

- **Etiquetas, faltantes, avisos y usuarios**: en memoria (`useMemoryTable`).
- **Maestro** (5.736 SKU): **en la BD** (`useServerTable` + `GET /maestro/references` con filtros y
  `GET /maestro/facets`). Filtrar en cliente habría mirado sólo las 100 filas de la página → resultado
  falso con apariencia de correcto. El `sort` va contra **lista blanca**: sin ella sería inyectable.
- **Exportar a Excel la vista filtrada** (`GET /maestro/export`): lo genera el servidor, con los mismos
  filtros y orden que se ven. Los códigos se escriben como **texto celda a celda** (si no, Excel convierte
  el EAN13 en notación científica y pierde los ceros a la izquierda: sería corromper el dato al exportarlo).

### REQ-003 · Ropa, calcetines y bolsas ✅
Ya se etiquetan. Su SKU tiene **tres tallas** y confundirlas imprime el código de barras de otro producto:
`talla_sap` (viene en el PDF: 31, C01) · `talla_tiendas` (va al código: 11, 35) · `size` (se imprime: S,
36-38, U). En calzado las tres coinciden y no cambia nada. **La traducción se LEE del maestro, fila a fila.**

Validado con los **6 pedidos reales** de Silvia (`validaciones/14-07-2026/`): ropa y calcetines salen con
0 faltantes y el cuadre exacto. `BACKPACK` está **excluido** (no se vende) pero se **reporta** en el pedido.

⚠ **Deuda:** la hoja `ROPA` del Excel tiene los rótulos mal (los datos, bien). Se lee **por contenido**, con
aviso en cada carga. Si algún día Silvia la rotula como `CALCETINES`, el parche se desactiva solo. Mientras,
es frágil: se rompe si alguien inserta una columna en esa hoja.

### REQ-004 · Destinos gestionables ✅
El **destino** decide qué códigos lleva la etiqueta y el "importado por" que se imprime. Antes vivía en
`markets.ts`: abrir un cliente nuevo o cambiar una razón social exigía **tocar el repo y desplegar**.

Ahora vive en la tabla `destination` y lo gobierna Silvia desde **Destinos** (sidebar, **sólo admin**):
alta y edición en un modal, y activar/desactivar desde la columna de acciones. Los 6 de siempre están
sembrados por migración, idénticos. `GET /api/markets` sale de la BD y **sólo ofrece los activos**.

**Los códigos se eligen con checkboxes** (`CODE128` · `UPC` · `EAN`): una variante es sencillamente qué
códigos lleva la etiqueta. El motor **siempre** los trató por separado — las «4 variantes» eran 4 de las 7
combinaciones, y CODE128 a solas no se podía pedir por el **nombre**, no por el motor. El nombre se **deriva**
en orden canónico `CODE128 → UPC → EAN`, regla que reproduce exactamente los nombres de siempre: el fichero
de salida (`etiquetas_4603662_UPC_EAN.xlsx`) y la celda «Variante» **no cambian**, y los consume otro proceso.

**Lo que no se negocia:** al menos un código (una etiqueta sin código no es una etiqueta); la API sólo acepta
las 7 combinaciones (es pública, la pantalla no es la única puerta); y los destinos se **desactivan, no se
borran** — uno desactivado **no genera**, y lo dice claro.

Verificado con el pedido real `4603662` por los **seis** destinos: 448 filas / 11.028 pares, cuadre OK, misma
variante, mismo "importado por" y mismo nombre de fichero que antes. Y CODE128 a solas, probado de punta a punta.

## Despliegue (DigitalOcean App Platform) — LISTO para desplegar

Todo el andamiaje está hecho y **probado construyendo la imagen de verdad**. Guía completa en
[`docs/despliegue.md`](docs/despliegue.md). En corto:

- **`Dockerfile`** de la API con `poppler-utils` + `openssl` (las dos dependencias de sistema que
  `npm ci` no instala y sin las que la app no sirve).
- **`.do/app.yaml`**: web en `/`, api en `/api` (con `preserve_path_prefix`), Managed Postgres, migraciones
  automáticas al arrancar.
- **`JWT_SECRET` es obligatorio en producción**: sin él la app NO arranca (antes usaba un secreto de dev
  del código → tokens falsificables).

**Lo que falta, y sólo lo puede hacer Pablo** (necesita la cuenta de DO): crear la app (`doctl apps create
--spec .do/app.yaml` o importar el spec en el panel), poner el `JWT_SECRET` como secreto, crear el primer
admin por la consola del componente, y cargar el maestro desde la web. Usa el subdominio `.ondigitalocean.app`.

## En vuelo (30/07)

- **Ya en `main`:** BUG-006 + **REQ-010** (poda configurable: sociedad + surtidos), **REQ-011** (surtidos por
  **prefijo** 76/86), BUG-007, BUG-008 (surtidos: expandir al catálogo), y **REQ-008 RRHH Fases 0–4**.
  REQ-006/007/009 en prod.
- **REQ-008 · RRHH — Fases 1–4 COMPLETAS y en `main`.** Fichajes (motor + cuadro de mando + histórico +
  corrección con traza + horas extra), ausencias (tipos + aprobación + saldos + calendario + coordinación con
  fichaje) y refinos (avisos in-app + export). Único pendiente de infra: el **envío por correo** (SMTP).
- **REQ-008 · RRHH — tanda de UX inspirada en Factorial (semana 28–30/07), toda en `main` salvo la última:**
  - **Home role-adaptive** + próximos cumpleaños + "estás fichando"; **campana de avisos**; sidebar con scroll.
  - **Geolocalización opcional al fichar** (solo coords, con consentimiento; nunca bloquea).
  - **Privacidad de cumpleaños** (ocultar sin borrar la fecha).
  - **Time-off UX**: reglas del tipo en la solicitud, resumen calculado, medio día 1ª/2ª mitad, calendario
    unificado (Mi año / Equipo), filtro activas/todas, tipos **editables**, saldo estilo Factorial (maqueta).
  - **Festivos por centro** (o globales), con carga masiva y pintados en el calendario.
  - **Mi jornada por MES** (calendario navegable, escala a años) con días **"falta fichar"** y
    **auto-edición** de los propios marcajes de los últimos 14 días (auditado).
  - **Organigrama en lienzo** (React Flow: zoom/pan/minimap, colapsable, buscador) — escala a cientos.
  - **`feat/rrhh-ux-detalles-2` (pusheada, PENDIENTE de merge):** fichar en calendario + 2 columnas;
    **fecha "ficha desde"** por empleado (no marca falta antes del alta); check "crear empleado" al alta de
    usuario; skeletons de carga; ancho consistente entre pestañas; fix del selector de departamentos;
    menos zoom inicial del organigrama.
- **Con esto, la Fase 2 (Slice 2c: horario teórico + horas extra) y la Fase 3 (ausencias) quedan CERRADAS.**
- **Arranque en frío del módulo (IMPORTANTE):** el módulo exige ficha de empleado para verlo, y sólo un empleado
  de gestión da de alta a otros → nadie puede crear el primero desde la UI. Se resuelve con **`RRHH_BOOTSTRAP_EMAIL`**
  (opcional `RRHH_BOOTSTRAP_NAME`): al arrancar, enlaza ese **usuario del login existente** con una ficha de
  empleado **ADMIN**. Idempotente; tras el primer arranque se puede quitar. En el deploy: definir la variable y
  redesplegar. En local: en el `.env`, o `RRHH_BOOTSTRAP_EMAIL=… npm run dev`. Mismo patrón que `ADMIN_EMAIL`.
- **Acción de negocio pendiente (Silvia), no de BD:** para podar materiales/surtidos por color el borrador
  debe traer la **Horma**. En el último Excel ya venía rellena (BUG-006 resuelto por su lado). Falta validar
  la poda completa con un prepedido real.

## Siguiente hilo (elige uno)

1. **Mergear `feat/rrhh-ux-detalles-2`** (pusheada, verde: typecheck + API 347 + web 95 + build). Trae la
   migración `fichaje_desde` (se aplica sola en el deploy).
2. **Saldo de vacaciones real** (el "devengado" está de maqueta): definir la política de devengo con negocio
   y calcularlo de verdad. Hoy Disponible/Disfrutado son reales; Devengado va marcado como borrador.
3. **Adopción con Silvia:** validar la poda completa (materiales + surtidos por prefijo) con un prepedido real
   ahora que la Horma viene rellena. Es lo que desbloquea el valor de REQ-005/010/011.
4. **Fase 2 · Bloque 3 — gobernanza del maestro**: publicar el maestro a Excel/Sheets para los
   departamentos, y coordinar accesos con Tomás.
5. **Avisos por correo (SMTP)** de RRHH: el modelo deja el enganche; falta servidor/credenciales (con Tomás).
6. **Fase 4**: plantillas de ventas. Próximos requerimientos anunciados: gestión de email, listados de
   stocks, listados de ventas.

## Cómo se clasifica lo que entra (no todo es un requerimiento)

**REQ** = valor de negocio nuevo (ritual `/nuevo-requerimiento`) · **MEJ** = mejora sobre algo existente
(UX/rendimiento/DX, no toca el dato) · **BUG** = ya debía funcionar y no funcionaba (exige síntoma, causa
raíz y **test de regresión que se comprueba que falla**). Detalle en
[`diseño/03-backlog-requerimientos.md`](diseño/03-backlog-requerimientos.md).

> **El patrón de los peores bugs de este proyecto: no fallan, MIENTEN.** El parser que se comía 798 pares y
> aun así "cuadraba"; el filtro que habría mirado 100 filas de 5.736; el `qs` que vaciaba la tabla sin error.
> Ante cualquier cosa que pueda devolver un resultado incompleto, la pregunta no es *"¿falla?"* sino
> **"¿cómo me enteraría de que está mintiendo?"**.

## Calidad: la puerta exige cobertura

```bash
npm run typecheck && npm test && npm run build
```

`npm test` **mide la cobertura y falla por debajo del 75%** (API con Jest, web con Vitest). Se mide sólo la
**lógica** (dominio, casos de uso, parsers, motor de la tabla), no el pegamento. Hoy: **API 82,5%** (52 tests)
y **front 94,7%** (33 tests). Si la cobertura cae, **falta un test** — no se baja el umbral.

## Deuda técnica conocida

- **Al desplegar**: definir `JWT_SECRET` en el entorno (hoy hay un secreto de desarrollo por defecto
  **en el código**, así que sin definirlo los tokens son falsificables). Servir por HTTPS y valorar
  cookie `httpOnly` en vez de `localStorage`.
- **Despliegue sin definir**: no hay Dockerfile, ni docs de deploy, ni CI. Importa porque **`pdftotext` es
  dependencia del sistema operativo y `npm ci` no la instala**: el servidor se comería el mismo fallo que
  en local. Cuando se sepa dónde se despliega, es una línea (`apt-get install -y poppler-utils` en la imagen
  o en el aprovisionamiento). Mitigado de momento: la API lo avisa al arrancar y responde 503 explicándolo.
- **Sin tests**: controladores HTTP, adapters (Prisma/Excel), páginas React y el módulo `auth`. Están
  **excluidos de la cobertura a propósito** (son pegamento e I/O). La consecuencia hay que tenerla presente:
  **los fallos de presentación no los caza el 75%** — se cazan probando la app en el navegador.
- `import-master.use-case.ts` sigue al 0%. (`maestro-query.service.ts` ya está cubierto: 18 tests, incluida
  la lista blanca de columnas para ordenar, que **es seguridad**.)
- El maestro se sube a mano; leerlo del Drive por API sigue pendiente (DEP-02).
