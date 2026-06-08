# REQ-001 · Creación de colección COOLWAY (BD maestra, ficheros SAP, plantillas de ventas y etiquetas)

- **Estado:** 🔍 En análisis · **Fecha:** 2026-06-08
- **Área:** Catálogo / Producto (con derivadas a Pricing, Ventas y Logística)
- **Solicitante:** Silvia Mayordomo (Dir. Finanzas y Marketing) · Cc Carlos, Nico (Coolway)
- **Fuente:** [`docs/requerimientos/REQ-001-email-silvia-coleccion-coolway.md`](../../../docs/requerimientos/REQ-001-email-silvia-coleccion-coolway.md) + adjuntos reales en `docs/requerimientos/`

> ⚠️ Esto es un **EPIC**, no una tarea. Silvia lo desglosa en 4 entregables con una dependencia clara:
> **todo cuelga de una base de datos maestra fiable**.

---

## Problema de negocio

Sacar una colección (p.ej. **COOLWAY SS27**) es hoy un proceso **manual, frágil y repartido entre 4 sistemas que no se hablan**:

- **Prepedidos / sistema 400** → tiendas YORGA. Genera los SKU desde un contador y los códigos de barra (UPC, EAN13, CODE128).
- **Access** → maestro modelo/color/proveedor + tarifas y surtidos (pre-requisito para transferir desde Prepedidos).
- **SAP** → distribución **Vanyor** (sociedad 2000 / Coolway USA 4000), que es quien vende la colección. Regenera sus propios códigos en el pedido de compra.
- **Drive (Excel `REFERENCIAS COOLWAY`)** → base de datos de facto que consumen web, marketing, ventas y clientes.

Silvia actúa como **bus de integración humano**: crea referencias, transforma a mano el formato entre sistemas, depura ficheros (los continuativos sacan referencias de más), cuadra códigos de barra y valida pedidos. Es lento, no escala y es propenso a error.

**El dolor agudo es el fichero de etiquetas:** los códigos que genera Prepedidos y los que genera SAP **no cuadran**, y hay que comprobar fichero a fichero. Silvia ya intentó resolverlo con IA y funcionó razonablemente (incluso grabó un "skill"), pero con errores recurrentes (ver abajo).

**A quién duele:** marca COOLWAY, sociedad Vanyor, y los departamentos consumidores (web, marketing, ventas) + clientes/representantes que reciben códigos antes de pasar pedido.

---

## Sistemas afectados (entradas / salidas / dueño del dato)

| Sistema | Rol | Dato del que es (o debería ser) dueño | Acceso conocido |
|---|---|---|---|
| **Prepedidos / 400** | Genera SKU "YORGA" + códigos UPC/EAN13/CODE128 | SKU de tienda, códigos a priori | Exports; el 400 **no tiene campos para tallas 36–46 en una sola ref** → obliga a doble ref chica(76)/chico(86) |
| **Access** | Maestro modelo/color/proveedor; tarifas; surtidos | Surtidos y tarifas origen | Exports (`.txt`) |
| **SAP (Vanyor)** | ERP de distribución/venta; pedidos compra y venta | Referencia SAP, pedidos, cálculo de importe | PDF de pedido de compra (extraíble); exports condiciones (VKP0) |
| **Drive · `REFERENCIAS COOLWAY.xlsx`** | "Base de datos" compartida | **Códigos de barra canónicos que se pasan a clientes** | 37 pestañas (1/modelo): `NAME, COLOR, REF., SIZE, EAN13, SKU, COLOR NAME WEB, UPC` |

**Datos que fluyen y dónde se duplican:**
- *Maestro de producto* (modelo/color/proveedor/temporada): duplicado en Access, Prepedidos, SAP y Drive.
- *SKU / referencias*: nacen en Prepedidos/400, se transforman a SAP, se espejan en Drive.
- *Códigos de barra* (EAN13/UPC/CODE128): generados en Prepedidos, **deberían** vivir en el Drive como verdad, pero **SAP regenera otros** → **conflicto raíz**.
- *Surtidos* (pack talla→pares, p.ej. `00I-W = 1·36 2·37 3·38 3·39 2·40 1·41 = 12`): Access/plantillas.
- *Tarifas / PVP*: Access → SAP (PVP nacional; internacional = +10€ automático en SAP).

### Reglas de transformación (núcleo determinista y reutilizable)
- **SKU tienda → ref. SAP:** `7683550` (3er dígito = color) → `7603550` (3er dígito siempre 0, +0 al final) + color(3díg) + surtido(3díg).
  - Par suelto 36: `76035500800036`. Surtido I: `7603550080000I`.
- **CODE128 = ref. YORGA + `00000` + talla.** (BARESI GRY 36 → `76835550000036`). Verificado en fichero `modelosEAN13 code 128-4603187.xlsm`.
- **Doble referencia chica(76)/chico(86):** mismo modelo, tallas 40-42 coinciden → **UPC compartido, EAN13 distinto**. Es la principal fuente de error.
- **Surtidos por género:** I/KR → ref 76 (chica 36-42); Z/P → ref 86 (chico 40-46); DEI = tallas **37–42**.

---

## Encaje arquitectónico

Este requerimiento es **el caso de uso canónico de nuestra arquitectura objetivo**: varios sistemas fuente sin integrar, dato duplicado, y una persona haciendo de integración manual. Cae en el dominio **Catálogo/Producto (PIM)** con derivadas a Pricing, Pedidos y Logística.

| Principio objetivo | Cómo encaja hoy |
|---|---|
| **1 fuente de la verdad por dominio** | ❌ **VIOLADO**: el código de barra tiene **dos generadores** (Prepedidos y SAP) y **tres copias**. Pregunta central de arquitectura: *¿quién es el dueño canónico del código de barra por SKU?* |
| **Integrar, no reescribir** | ✅ No tocamos 400/SAP; añadimos una capa que normaliza y reconcilia. |
| **Empezar por el dato** | ✅ La iniciativa #1 de Silvia ("BD que ven los departamentos") **ES** construir la fuente de verdad. Tarifas, plantillas y etiquetas son **consumidores** de ese dato. |
| **Desacoplar por eventos** | ⚠️ Silvia avisa: la BD cambia al principio; hay que "congelar"/automatizar **tras** publicar la colección, no al crearla → define un evento de negocio **"colección publicada"**. |

La buena noticia: la lógica de transformación de referencias es **determinista y está documentada** → automatizable con alta fiabilidad y cubrible con tests (tenemos ground-truth real: pedidos 4603418, 4603187, 4603292).

---

## Opciones y recomendación

El epic tiene dependencia clara (todo cuelga de la BD maestra). El dilema es la **secuencia**:

**Opción A — Empezar por el dolor concreto (etiquetas) como quick win.**
- ➕ ROI en semanas, riesgo bajo, ya hay prototipo IA + ground-truth validado por Silvia.
- ➖ Si el Excel maestro no está limpio, arrastramos su fragilidad.

**Opción B — Empezar por la BD maestra (fuente de verdad) primero.**
- ➕ Ataca la causa raíz (1 fuente de verdad).
- ➖ Lento en mostrar valor; el dato cambia al principio (difícil congelar); riesgo de "proyecto de fontanería" sin entregable visible.

**Opción C — (RECOMENDADA) Quick win + cimientos, mismo motor.**
Construir el **motor de etiquetas** (Opción A) **pero** diseñándolo para leer de un **esquema de datos maestro bien definido**, no de un Excel ad-hoc. Así el primer consumidor (etiquetas) **fuerza a especificar el contrato de la BD canónica**. La lógica de transformación de referencias se aísla como **módulo reutilizable** que luego servirá a tarifas/surtidos y plantillas.
- ➕ Entrega valor rápido **y** construye el cimiento correcto; evita el falso dilema A/B.
- ➖ Exige disciplina de diseño desde el día 1 (no "script rápido y ya").

> **Recomendación: Opción C.** Primer entregable = **fichero de etiquetas**, tratado como el primer consumidor de un **modelo de datos maestro de colección**. La reconciliación del *dueño del código de barra* se aborda en paralelo con los informáticos del 400/SAP.

### Sub-entregables del epic (orden propuesto)
1. **Etiquetas** (quick win + define contrato de datos) ← empezar aquí.
2. **BD maestra canónica** (consolidar y gobernar el Excel del Drive como fuente de verdad).
3. **Ficheros de materiales / tarifas / surtidos** para SAP (reutiliza el motor de referencias).
4. **Plantillas de ventas** (valorización por surtido + ref. SAP para meter pedidos).

---

## Preguntas abiertas y riesgos

**Preguntas (a cerrar antes de implementar):**
- [ ] **¿Quién es el dueño canónico del código de barra: Prepedidos o SAP?** Es la causa raíz del descuadre. Cerrar con los informáticos del 400/SAP.
- [ ] **¿El Excel maestro del Drive es fiable y está siempre actualizado** antes de generar etiquetas? ¿Quién lo mantiene y cómo?
- [ ] **Acceso programático:** ¿podemos leer/escribir el Drive (Google API)? ¿SAP y Prepedidos exponen API/exports, o todo es PDF + ficheros manuales?
- [ ] **Volumen y frecuencia:** ¿cuántas colecciones/temporadas y pedidos al mes? Define si es un *script asistido* o un *servicio*.
- [ ] **Multi-marca:** esto es COOLWAY. ¿Ulanka/Musse usan el mismo flujo Prepedidos/SAP? (afecta a generalización).

**Riesgos:**
- ⚠️ La **doble ref chica(76)/chico(86)** con UPC compartido y EAN distinto es el error #1 de la IA → codificar con tests explícitos.
- ⚠️ **Gobernanza del dato:** automatizar sobre un Excel que se edita a mano reintroduce errores. Necesitamos el evento *"colección congelada/publicada"*.
- ⚠️ Errores conocidos del prototipo IA a evitar: sumar DEI del 36-41 (es 37-42); mezclar refs 76/86; fundir líneas de distinta caja; una sola Excel para varios pedidos.

---

## Próximos pasos

1. **Validar con Pablo** el enfoque (Opción C) y el orden (etiquetas primero).
2. **Mini-sesión técnica** con informáticos 400/SAP: dueño canónico del código de barra + vías de acceso (API/exports).
3. Si se valida → **diseño detallado del motor de etiquetas**: contrato de datos, reglas de transformación con casos de prueba usando 4603418 / 4603187 / 4603292 (ya en `docs/`).
4. Cuando madure a implementación → **disparador OpenSpec + `git init`** (ver decisión en memoria).

> Ground-truth disponible para tests: `4603418.pdf` (pares sueltos, NILO BRW) + su salida correcta `etiquetas_4603418_upc_ean.xlsx`; `4603187` (CODE128+EAN, cajas surtidas); `4603292` (UPC+EAN, cajas surtidas).
