# REQ-010 · Poda configurable: elegir sociedad y surtidos

- Estado: 🔍 En análisis · Fecha: 2026-07-24
- Área: Catálogo / alta de producto en SAP (extiende REQ-005)
- Origen: correo **«FICHERO DE MATERIALES Y BASE DE DATOS»** de Silvia Mayordomo
  (`silviam@grupoyorga.com`), 23/07/2026, reenviado por Pablo el 24/07.
  Adjuntos: `compr poda materiales.xlsx`, `b.14ZCALvanyor…608 reg.txt`, `ZSD_A906…`, `ZSD_A073…`,
  `ZCAL surtidos…630 reg.txt`.

> Este correo traía **cinco temas**; sólo dos son este REQ. Los otros: el color web (**feedback OK** de
> REQ-009), las tarifas (**salen bien**, nada), y el **descuadre de materiales** («deberían salir 96 líneas»)
> que se gestiona **aparte como BUG** (vía `bug-correo-tarea`), no aquí.

## Problema de negocio

REQ-005 automatizó **podar** los ficheros de SAP a lo comprado. Silvia lo ha usado y pide **dos ajustes**
que hoy sigue haciendo a mano fichero a fichero:

### 1. Elegir la sociedad
Antes había una sociedad; **ahora hay dos**:

| Sociedad | Código |
|---|---|
| VANYOR | `2000` |
| COOLWAY USA | `4000` |

Todos los ficheros que genera Prepedidos **salen con la `2000`**. Según en qué sociedad se dé de alta la
compra, Silvia tiene que **cambiar ese código a mano** en cada fichero, en columnas distintas según el tipo
(lo dice el correo):

| Fichero | Dónde va la sociedad (según Silvia, columna 1-based) |
|---|---|
| Materiales | columnas **2 y 3** |
| Tarifa **A906** | columna **3** |
| Tarifa **A073** | **no la lleva** → se queda igual |
| Surtidos | columna **2** |

Quiere **elegir la sociedad** al podar y que el sistema **reescriba** ese código en las columnas que toquen.

### 2. Elegir los surtidos (no arrastrar los del fichero)
Hoy el fichero de surtidos trae los **surtidos por defecto** que propone Access — muchos, y **la mayoría no
sirven**, así que Silvia los edita en cada fichero. Pide poder **decidir qué surtido aplicar por rango de
referencia** (las `76*` con unos surtidos, las `860*` con otros) y, mejor aún, tener una **base de datos de
surtidos propia** para **elegirlos** por modelo/color/referencia — *"un surtido por cada referencia en lugar
de todos esos que no sirven"*.

## Sistemas afectados (entradas / salidas / dueño del dato)

**Entradas (lo que consume):**
- Los mismos ficheros crudos de SAP/Prepedidos + el borrador de compra que ya usa REQ-005.
- **Nuevo — la sociedad elegida** (`2000` / `4000`): dato de **contexto de la operación**, lo pone quien poda.
- **Nuevo — la BD de surtidos**: catálogo de surtidos que Silvia define y elige. **Dueño del dato: Silvia /
  el negocio** (igual que los destinos de REQ-004 — dato suyo, gestionado desde la web). Hoy ese criterio vive
  disperso en Access; aquí pasaría a ser dato propio.

**Salida (lo que produce):** los mismos ficheros podados, ahora además con **la sociedad reescrita** y **los
surtidos elegidos** (no los por defecto).

**Dueño del dato de fondo:** sin cambios respecto a REQ-005 — **SAP** es la verdad del maestro, **Prepedidos**
la de la compra; nosotros transformamos entre export e import. La **novedad de dueño** es el **catálogo de
surtidos**, que sí sería nuestro (de Silvia), como los destinos.

## Encaje arquitectónico

Extiende el motor de poda de REQ-005 (dominio de filtrado + lector por formato + serializador). Pero hay un
**cambio de fondo que hay que mirar de frente**:

> **REQ-005 sólo filtra: "NUNCA compone una línea, sólo deja pasar o quita"** (regla de oro, análoga a RF-12
> de las etiquetas). REQ-010 pide **transformar** líneas. Eso hay que acotarlo con cuidado, porque la parte
> de surtidos puede cruzar la línea de *inventar dato*.

Dos transformaciones, con **riesgo muy distinto**:

- **Sociedad (bajo riesgo): reescribir un campo que ya existe.** Cambiar la columna de sociedad de `2000` a
  `4000` es **transformar un valor conocido**, no fabricar un código de barras ni una ref. Es controlado y
  reversible. Encaja como una config del serializador (`sociedadCols` por tipo de fichero, en la línea de
  `FORMATOS` del `sap-file-reader`). **A073 no la lleva → no se toca.**
- **Surtidos (alto riesgo): aquí está el nudo.** Hay dos maneras, y **cambian por completo si respetamos "no
  inventar"**:
  - **(a) Sólo filtrar** entre los surtidos que **ya trae el fichero**: quedarse con el que Silvia elige y
    quitar el resto. **No compone nada** → coherente con la regla de oro. Limita a "elegir de lo que hay".
  - **(b) Inyectar** el surtido elegido aunque **no esté** en el fichero crudo: esto **compone una línea
    nueva** → choca con la regla. Sólo sería admisible si el surtido viene de una **fuente de verdad** (la BD
    de surtidos) con formato garantizado, y aun así hay que decidir explícitamente que aquí sí se genera.

  **Recomendación:** empezar por **(a)** (elegir de lo que el fichero ya ofrece) y, si el negocio necesita
  surtidos que el fichero no trae, abordar **(b)** como decisión de diseño aparte y explícita — no colarla.

## Opciones y recomendación

- **Alcance — recomendado: entregar en dos fases dentro del mismo REQ.**
  - **Fase 1 · Sociedad** (barata, alto valor, bajo riesgo): selector de sociedad al podar + reescritura de la
    columna por tipo de fichero. Cierra el dolor más inmediato ("todo sale con la 2000").
  - **Fase 2 · Surtidos** (la de fondo): **BD de surtidos** gestionable desde la web (patrón REQ-004) +
    selección al podar, empezando por el modo **(a) filtrar**. La parte con más decisiones abiertas.
- **BD de surtidos — cómo modelarla:** ¿el surtido se elige por **rango de ref** (`76*`/`860*`, como dice el
  correo), por **familia**, o por **modelo/color/referencia** (lo que también menciona)? Define la clave del
  catálogo. A concretar con Silvia con casos reales.
- **Sociedad — ¿catálogo o enum?** Con dos valores (`2000`/`4000`) un **selector fijo** basta hoy. Si se
  prevén más sociedades, un mini-CRUD como el de destinos. Recomendación: **selector simple ahora**, catálogo
  sólo si aparece la tercera.

## Preguntas abiertas y riesgos

1. **🔴 El nudo — surtidos y la regla "no inventar".** ¿Modo **(a) filtrar** lo que el fichero ya trae, o
   **(b) inyectar** el surtido elegido? Cambia el diseño entero. Recomendado (a) primero. **Decisión de Pablo/
   Silvia.**
2. **Columnas de sociedad — verificar el índice exacto.** Silvia cuenta en 1-based ("2ª y 3ª"); el lector usa
   posiciones 0-based concretas (`materiales matnrCol:6, colorCol:29`…). Hay que **localizar la columna real de
   sociedad en cada `.txt`** (con los adjuntos del correo) antes de reescribir. Reescribir la columna
   equivocada sería un error silencioso subido a SAP.
3. **¿La sociedad afecta a algo más que la columna?** (¿el maestro, las refs, las tarifas cambian por
   sociedad, o es sólo ese código?) Confirmar que es un simple cambio de campo.
4. **Clave de la BD de surtidos** (ver opciones). Sin la clave clara, el catálogo no se puede modelar.
5. **Regla del proyecto — "¿cómo me enteraría si miente?"** Si la poda reescribe la sociedad en la columna
   equivocada, o elige un surtido que no era, el fichero **sube a SAP mal en silencio**. La transformación
   debe **validar** (columna esperada presente, surtido elegido existente) y **reportar** en vez de producir
   salida dudosa — como ya hace REQ-005 con `compradoQueFalta`.

## Próximos pasos

1. **Cerrar el modo de surtidos** (a) vs (b) con Silvia — es lo que desbloquea la Fase 2.
2. **Verificar la columna de sociedad** real en cada fichero adjunto (materiales, A906, surtidos) y confirmar
   que A073 no la lleva.
3. **Definir la clave de la BD de surtidos** (rango de ref / familia / modelo-color-ref) con casos reales.
4. **Implementar Fase 1 (sociedad):** selector + reescritura por formato + validación defensiva + test.
5. **Diseñar e implementar Fase 2 (surtidos):** CRUD de BD de surtidos (patrón REQ-004) + selección al podar.
