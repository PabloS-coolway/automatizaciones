# Estado del proyecto · dónde vamos y qué sigue

> Documento de traspaso. Si retomas el trabajo (o cambias de ordenador), **empieza por aquí**.
> Última actualización: **2026-07-12**. Historial detallado en [`CHANGELOG.md`](CHANGELOG.md).

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
  *Cargar maestro completo*) o por CLI (`maestro:seed`). ~5.548 SKU.
- **Actualizar códigos**: importa los exports de prepedidos `EAN.xlsm` + `UPC.xlsm` (une por ref+talla,
  calcula SKU, upsert idempotente, con informe).
- Al generar etiquetas se puede elegir el maestro **desde la BD o desde un Excel subido**.

### Acceso ✅
Login con JWT, usuarios en la misma Postgres (bcrypt). Roles **operador** / **admin**. El import y la
carga del maestro y la gestión de usuarios son sólo de admin. Pantalla de **Usuarios** para altas/bajas
sin CLI. El primer admin se crea con `npm run auth:create-user`.

## ⚠ Hallazgo pendiente de resolver con Silvia

**El Excel maestro tiene 29 filas con EAN13 duplicado.** Un EAN13 identifica un producto único, así que
la base de datos las rechaza y **esas 29 tallas no se pueden etiquetar**.

Ejemplo real: el código `8433852550355` está asignado a la vez a **GOAL EXP talla 42** y a
**GOAL BRW talla 42**. Por eso el pedido 4603338 descuadraba en 1 par al generar contra la BD.

Afectados: `GOAL KAK`, `GOAL EXP`, `KIZUNA FRS/GHY`, `BECKS BUR/PUR/RED`, `BECKS X SLV`.
**Cómo verlos**: al cargar el maestro, la web lista cada fila rechazada con su modelo, color, ref, talla
y el EAN13 duplicado concreto. No se pierde nada en silencio.

**Acción pendiente**: pasarle el listado a Silvia para que corrija los duplicados en el maestro.

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

**Maestro**: `docs/requerimientos/REFERENCIAS COOLWAY.xlsx` (súbelo como fichero, o cárgalo antes en la
BD y elige *maestro = base de datos*).

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

## Siguiente hilo (elige uno)

1. **Fase 2 · Bloque 3 — gobernanza del maestro**: publicar el maestro a Excel/Sheets para los
   departamentos, y coordinar accesos con Tomás. *(Es lo natural ahora.)*
2. **Demo a Silvia** con la herramienta, y pasarle los 29 EAN13 duplicados.
3. **Fase 3**: ficheros de tarifas/surtidos SAP. **Fase 4**: plantillas de ventas.
4. Próximos requerimientos anunciados: gestión de email, listados de stocks, listados de ventas.

## Deuda técnica conocida

- **Al desplegar**: definir `JWT_SECRET` en el entorno (hoy hay un secreto de desarrollo por defecto
  **en el código**, así que sin definirlo los tokens son falsificables). Servir por HTTPS y valorar
  cookie `httpOnly` en vez de `localStorage`.
- No hay tests del front ni del controlador HTTP (sí del dominio: 36 en verde).
- El maestro se sube a mano; leerlo del Drive por API sigue pendiente (DEP-02).
