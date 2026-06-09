# REQ-001 · Especificación de requerimientos

- **Estado:** 🔍 En análisis · **Fecha:** 2026-06-08
- **Enfoque validado:** Opción C — etiquetas primero como primer consumidor de un modelo de datos maestro.
- **Relacionado:** [`diseño.md`](diseño.md)

> Convención de IDs: **RD** = requerimiento de datos · **RF** = funcional · **RN** = regla de negocio · **RNF** = no funcional · **DEP** = dependencia bloqueante.
> Prioridad: 🅼 *Must* · 🆂 *Should* · 🅲 *Could*.

---

## 0. Alcance y fases

El epic se entrega en 4 fases dependientes. Esta spec **detalla la Fase 1 (etiquetas) + el fundamento de datos compartido**; las Fases 2–4 se enumeran a alto nivel y se detallarán al llegar a ellas.

| Fase | Entregable | Estado spec |
|---|---|---|
| **1** | Fichero de etiquetas + contrato de datos maestro | **Detallada aquí** |
| 2 | BD maestra canónica gobernada | Alto nivel |
| 3 | Ficheros materiales / tarifas / surtidos para SAP | Alto nivel |
| 4 | Plantillas de ventas | Alto nivel |

---

## 1. Fundamento de datos (transversal a todo el epic)

| ID | Prioridad | Requerimiento |
|---|---|---|
| **RD-01** | 🅼 | Existe **un modelo de datos maestro de colección** como fuente de verdad del catálogo+códigos. Estructura mínima por SKU: `style, color, ref. (SKU YORGA), size, ean13, upc, color_name_web`. Hoy materializado en `REFERENCIAS COOLWAY.xlsx` (1 pestaña/modelo). |
| **RD-02** | 🅼 | **No se crean EAN/UPC nuevos.** Los códigos de barra se *leen* del maestro; el sistema nunca los inventa. |
| **RD-03** | 🅼 | El maestro distingue la **doble referencia chica (ref. 76*) y chico (ref. 86*)** del mismo modelo, con su EAN13 propio aunque compartan UPC en tallas solapadas (40–42). |
| **RD-04** | 🆂 | El maestro registra de qué **temporada/campaña** es cada SKU (para filtrar continuativos, que es donde Silvia hoy depura a mano). |
| **RD-05** | 🆂 | Definir el **dueño canónico del código de barra** y publicar desde ahí (resuelve el descuadre Prepedidos↔SAP). Depende de DEP-01. |

---

## 2. Fase 1 · Fichero de etiquetas

### 2.1 Funcionales
| ID | Prioridad | Requerimiento |
|---|---|---|
| **RF-01** | 🅼 | A partir de **un PDF de pedido de compra SAP** + el **maestro**, generar el **fichero de etiquetas** de ese pedido. |
| **RF-02** | 🅼 | Del PDF se extrae por línea: **modelo, color, surtido, rango de tallas, pares por talla del surtido, nº de cajas (boxes)**. |
| **RF-03** | 🅼 | Calcular **QTY por talla = pares por talla del surtido × nº de cajas**. Una **fila por talla**. |
| **RF-04** | 🅼 | Para cada `modelo+color+talla`, **buscar en el maestro** y adjuntar `ean13, upc` (y datos fijos de etiqueta). |
| **RF-05** | 🅼 | Salida con columnas exactas validadas: `style, color, ref., talla, SKU, QTY, ean13, upc` (formato `etiquetas_4603418_upc_ean.xlsx`). |
| **RF-06** | 🅼 | Soportar las **variantes de fichero de par** según lo pedido: `SOLO EAN`, `SOLO UPC`, `CODE128+EAN`, `UPC+EAN`. |
| **RF-07** | 🅼 | Si el pedido es **cajas surtidas** → además del fichero de par, generar **fichero de bultos**. Si es **pares sueltos** → solo fichero de par. |
| **RF-08** | 🆂 | Si el SKU viene **vacío** en el maestro, **componerlo** como `REF completa + "-" + talla` (ej. `7683550-36`). Es composición de texto sobre datos existentes, **NO acuñar referencias nuevas** (eso es trabajo de Prepedidos/400 y queda fuera de alcance). Los EAN/UPC, en cambio, **nunca se componen** (RD-02/RF-12). *Decisión Pablo 2026-06-08: Opción 1.* |
| **RF-09** | 🅼 | **Un fichero de salida por pedido** (nunca fundir varios pedidos en uno). |
| **RF-10** | 🆂 | Orden de salida: por `style, color, ref., talla`; primero todas las refs `760*`, después las `860*`. |

### 2.2 Reglas de negocio (deterministas — codificar con tests)
| ID | Prioridad | Regla |
|---|---|---|
| **RN-01** | 🅼 | **Ref. del PDF = ref. SAP**; la de la salida es la **ref. YORGA** del maestro, que se **busca por `(STYLE, COLOR, SIZE, GÉNERO 76/86)`** y se lee fila a fila — NO se reconstruye desde la ref SAP. El 3er dígito de la ref YORGA es el **color** (no 0). ⚠️ La ref puede **cambiar por talla** dentro del mismo color (validado: BARESI FUX 36-41=`7693164`, 42=`7693169`; NILO BRW real=`7643398`, no `7623398` como decía el correo). |
| **RN-02** | 🅼 | **CODE128 = ref. YORGA + `00000` + talla** (ej. BARESI GRY 36 → `76835550000036`). |
| **RN-03** | 🅼 | **Surtido DEI = tallas 37 a 42** (no 36–41). |
| **RN-04** | 🅼 | Surtidos **I/KR → ref. 76 (chica)**; surtidos **Z/P → ref. 86 (chico)**. No mezclar referencias dentro de una misma talla. |
| **RN-05** | 🅼 | Si falta el **UPC** de una talla solapada (41/42) en ref. chica, **copiar el UPC de la ref. de chico** (comparten UPC). |
| **RN-06** | 🅼 | Si una misma talla aparece en **distintos surtidos** del pedido, **NO** crear líneas duplicadas: una sola línea por talla. (Decisión pendiente: ¿se **suman** las QTY o se mantienen separadas por caja? — ver DEP-04). |

### 2.3 Validaciones / errores a prevenir (lecciones del prototipo IA)
| ID | Prioridad | Requerimiento |
|---|---|---|
| **RF-11** | 🅼 | **Cuadre de control:** la suma de pares de la salida debe coincidir con el total de pares del PDF; reportar descuadres en vez de fallar en silencio. |
| **RF-12** | 🅼 | Avisar de **códigos faltantes en el maestro** (SKU sin EAN/UPC) en lugar de inventarlos o dejar huecos. |
| **RNF-04** | 🆂 | Cada fichero generado deja **traza** de qué pedido y qué versión de maestro usó (auditoría del descuadre histórico). |

### 2.4 No funcionales
| ID | Prioridad | Requerimiento |
|---|---|---|
| **RNF-01** | 🅼 | **Fiabilidad sobre velocidad:** preferible que avise de una duda a que entregue un código de barra erróneo a un cliente. |
| **RNF-02** | 🅼 | **Repetible y auditable:** mismo input → mismo output; sin pasos manuales no registrados. |
| **RNF-03** | 🆂 | Operable por Silvia **sin perfil técnico** (entrada PDF + maestro → salida Excel). |

---

## 3. Fases 2–4 (alto nivel, a detallar al llegar)

- **Fase 2 · BD maestra canónica:** consolidar `REFERENCIAS COOLWAY.xlsx` como fuente de verdad gobernada; definir **evento "colección publicada/congelada"** tras el cual se automatiza (Silvia avisa que antes hay cambios). Resolver duplicidad con Access/Prepedidos/SAP.
- **Fase 3 · Ficheros para SAP:** generar materiales (modelo/color/proveedor/sociedad 2000/4000), **tarifas** (nacional, internacional = +10€ auto, USA, PVP) y **surtidos**; filtrar automáticamente los continuativos que hoy se depuran a mano. Reutiliza el motor de transformación de referencias.
- **Fase 4 · Plantillas de ventas:** generar plantillas por mercado (nacional, internacional, Italia, USA, Costa Rica, Dubái…) con surtidos por género, **valorización automática** (precio par × pares del surtido) y la **ref. SAP** para que ventas cargue pedidos.

---

## 4. Dependencias bloqueantes (a cerrar con negocio/IT antes de implementar)

| ID | Estado | Respuesta de Silvia |
|---|---|---|
| **DEP-01** | ✅ Resuelta | Autoridad = **maestro del Drive** (códigos de Prepedidos, generados antes de la colección; los pedidos de compra llegan 1-2 meses después). |
| **DEP-02** | ✅ Resuelta | Maestro = **Excel en Drive**, mantenido **a mano** por Silvia ([copia](https://docs.google.com/spreadsheets/d/11ncixa3TJAHVzyE0y9qZsm7EjN9CS_u2/edit)). Riesgo: otros departamentos borran códigos. **Congelación** tras enviar muestrarios + plantillas (luego solo se añaden modelos/colores nuevos). API/extracción → ver con Tomás (IT). |
| **DEP-03** | ✅ Resuelta | **2 temporadas/año**, ~**285 pedidos**/temporada, **todos** necesitan etiquetas. Trabaja en **bloques** (mismo código + mismo cliente) → conviene **modo batch**. |
| **DEP-04** | ✅ Resuelta | Mismo SKU → 1 línea sumando; chica(76) vs chico(86) → 2 líneas. **Coincide con RN-06 ya implementada.** |
| **DEP-05** | ✅ Resuelta | Musse & Cloud = mismo flujo. Ulanka = solo modelos comercializados (mismo flujo); resto de compras de tienda Ulanka NO entran en Drive/SAP. |
| **DEP-06** | ✅ Resuelta | Formato = el **simplificado** (`style, color, ref., talla, SKU, QTY, ean13, upc` + `code128` según variante + `importado por`). Es el que ya genera nuestro writer. PROVIDER y ORDER **no se usan**. La etiquetadora se acopla a lo que le mandemos. |
| **DEP-A6** | ✅ Resuelta | El **PDF de SAP tiene siempre la misma estructura**. |

## 5. Requerimientos nuevos (tras respuestas de Silvia)

| ID | Prioridad | Requerimiento |
|---|---|---|
| **RF-13** | 🅼 | **Columna `importado por`** en la salida: `VANYOR` (pedidos a Valencia/tiendas), `COOLWAY USA` (USA), o el **cliente/país** en distribuidores (ej. "Australia", "Italia"). Es un dato de **destino del pedido** (entrada del operador o derivado). |
| **RF-14** | 🅼 | **Preset destino → variante** (decide Yorga, a veces el cliente): Valencia/tiendas = **CODE128+EAN**; USA = **UPC+EAN**; Australia = **UPC**; Italia/UK/Costa Rica = **EAN**. |
| **RF-15** | 🆂 | **Modo batch:** procesar varios pedidos de golpe por **mismo cliente/variante** (bloques), no de uno en uno. |
| **RF-16** | ✅ | N/A con el formato simplificado: no incluimos columna de precio/ORDER ni PROVIDER. La salida solo lleva las columnas útiles (DEP-06). |
| **RF-17** | ✅ | **Bulto FUERA DE ALCANCE (confirmado Pablo 2026-06-09).** Las etiquetas de bulto van siempre CODE128 y se mantienen en SAP. El barcode del bulto embebe pedido + codificación SAP de color/surtido (ej. `017`+`4603187`+`7603425`+`0201`+`I`), no reproducible desde el maestro YORGA. El motor genera solo el **fichero de par**. |
