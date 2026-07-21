# REQ-005 · Podar los ficheros de SAP a lo realmente comprado

- Estado: 🔍 En análisis · Fecha: 2026-07-21
- Área: Catálogo / alta de producto en SAP
- Origen: correo **«FUNCIONES»** de Silvia Mayordomo (`silviam@grupoyorga.com`), 17/07/2026.
  Adjuntos: `prepedidos 2003.xlsx` (borrador de compra) + 4 `.txt` de SAP (materiales, tarifas 906/073, surtidos).

## Problema de negocio

Cuando entra una compra nueva, para dar de alta el producto en SAP hay que subir tres tipos de fichero:
**materiales**, **tarifas** (dos ficheros: `906` y `073`) y **surtidos**. Prepedidos los genera con **todo
el histórico**: todas las referencias del modelo, en **todos los colores** que hayan existido, de **todas las
campañas**.

Silvia tiene que **podar cada fichero a mano**, viendo el prepedido y borrando línea a línea todo lo que no
corresponde, hasta dejar **sólo las referencias y colores que se han comprado de verdad** en ese prepedido.

Es trabajo manual, repetitivo y **peligroso en las dos direcciones**:
- Si se **cuela una línea de más** → se da de alta en SAP una ref/color que no se ha comprado.
- Si se **borra una que sí tocaba** → no se da de alta lo que sí se ha comprado.

Ejemplo del correo (modelo **2003**): de todo lo que saca Prepedidos deben quedar **7 colores en la ref.
chica `76034250`** y **7 en la chico `86038320`**:

| Cód. SAP | Color | Ref. chica (76) | Ref. chico (86) |
|---|---|---|---|
| 100 | BGE | 7613425 | 8613832 |
| 766 | WGR | 7663425 | 8663832 |
| 201 | DBR | 7623425 | 8623832 |
| 801 | DGY | 7693425 | 8693832 |
| 860 | GHY | 7633425 | 8633832 |
| 710 | WPK | 7673425 | 8673832 |
| 001 | NBK | 7603425 | 8603832 |

## Sistemas afectados (entradas / salidas / dueño del dato)

**Entradas (lo que consume):**
- **Fichero crudo de Prepedidos** (materiales / tarifas / surtidos) — trae todo el histórico. *Dueño: Prepedidos/AS400.*
- **Excel del borrador de Prepedidos** (la compra real): qué refs y colores tienen **pares comprados (> 0)**.
  Es la **fuente de verdad de "qué se compró"** — las líneas del 2003 a 0 pares son continuativos que ya
  están en SAP y NO deben subirse. *Dueño: Prepedidos.*
- **Mapeo color-Prepedidos ↔ color-SAP** (3 dígitos: `BGE → 100`). ⚠ **Hoy NO existe en Prepedidos.** Silvia
  lo rellena a mano en la columna **«horma»**. *Dueño: sin dueño claro — el nudo del requerimiento.*

**Salida (lo que produce):** los mismos ficheros, **podados** a sólo lo comprado, listos para subir a SAP.

**Dueño del dato de fondo:** **SAP** es la fuente de verdad del maestro de artículos; **Prepedidos**, la de la
compra. Nosotros **no somos dueños de ninguno de los dos**: hacemos una **transformación (filtro)** entre un
export y un import. Es integración/ETL, no un sistema de verdad nuevo — coherente con *«integrar, no
reescribir»*.

## Encaje arquitectónico

Es **el mismo patrón que ya resolvimos con las etiquetas**: leer un fichero que produce un sistema (antes el
PDF del pedido; ahora el export de Prepedidos), cruzarlo con una **fuente de verdad** (antes el maestro;
ahora el borrador de compra), y producir un **fichero de salida**. Encaja en la app de automatizaciones
existente y su arquitectura hexagonal: un **dominio de filtrado** puro, **adapters** de lectura (Excel del
borrador + `.txt` de SAP) y un **serializador** de salida.

Y hereda la regla de oro del proyecto: **no se inventa nada** (análogo a RF-12). El filtro sólo **deja pasar
o quita** líneas que ya vienen en el fichero; **nunca compone** una línea nueva. Si algo del borrador no
cuadra con el fichero crudo, se **reporta** — no se fabrica.

## Opciones y recomendación

- **Opción A (recomendada): un único motor de poda**, parametrizado por tipo de fichero. Materiales, tarifas
  (906/073) y surtidos son **el mismo problema** (quedarse con las refs+colores comprados) sobre formatos
  distintos. Un dominio de filtrado + un lector por formato. Menos código, una sola regla que mantener.
- **Opción B: tres herramientas separadas.** Descartada: multiplicaría la misma lógica por tres y abriría la
  puerta a que se comporten distinto ante el mismo caso.

## Preguntas abiertas y riesgos

1. **✅ RESUELTO (21/07) — el riesgo del mapeo color↔SAP se deshincha: la clave de cruce es la `ref`.**
   Verificado contra la BD y contra un fichero de SAP real:
   - **El maestro NO guarda el código numérico de SAP** (100, 766, 460…). Guarda el código de **3 letras**
     (BGE, NAV…), `colorNameWeb`, `ref`, `ean13`, `upc`.
   - **Pero no hace falta.** El maestro ya liga **color (3 letras) ↔ ref**, y los **7 colores del correo
     están cargados para el 2003 con las refs idénticas** a las de Silvia (BGE `7613425`/`8613832`, WGR
     `7663425`/`8663832`, NBK `7603425`/`8603832`, y DBR/DGY/GHY/WPK igual).
   - **Y el propio fichero de SAP trae el puente dentro.** El surtidos real (`docs/requerimientos/P.BARESI
     ZCAL surtidos…txt`) tiene columnas `MATNR | MODELO | COLOR | <letras> | SURTD`: cada línea lleva la
     **ref (`MATNR`)**, el código SAP (`460`) **y** el de letras (`NAV`) juntos. El puente que Silvia hace a
     mano en «horma» ya está en el dato.
   - **Conclusión:** se poda **casando por `ref` (`MATNR`)**, que está en el fichero de SAP y en el borrador
     de prepedidos. **No hace falta pedir a Tomás una tabla de colores de SAP.**
   - ⚠ **A normalizar:** la ref sale en **8 dígitos** en surtidos (`76035500`) y en **7** en el maestro
     (`7603400`). Hay que igualar el formato antes de cruzar.
2. **✅ CONFIRMADO (21/07) con el `prepedidos 2003.xlsx` real — el borrador es autosuficiente.** Cada línea
   trae junto: `Our Reference` (la ref: `7613425`), `Horma` (el código SAP de color: `100`), `Color` (las 3
   letras: `BGE`) y `Suma` (pares comprados: `13` o vacío). El cruce cuadra **exacto**: **14 líneas con
   `Suma`>0** = los 7 colores × chica/chico del correo (idéntico a la tabla de materiales que puso Silvia); **6
   con `Suma` en blanco** = continuativos (YEL, SLV, ORG) a quitar. Así que:
   - **«Comprado» = `Suma` > 0.** Regla confirmada por el dato y por las palabras de Silvia en el correo.
   - **Se cruza por `Our Reference`** (o por `Horma`, el código SAP — el borrador trae ambos).
   - Para **materiales** ya tenemos el **resultado esperado** (los 14) para autovalidar sin pedir nada.
3. **✅ FORMATO ANALIZADO (21/07) con los 4 `.txt` reales** (`docs/requerimientos/validaciones/21-07-2026/`):
   - **Materiales** (113 cols, TAB): cartesiano de **6 familias de ref × 23 colores = 138 filas**. Familia en
     `MATNR`/`BISMT` (col 6: `76034000`,`76034250`,`76035530` chica · `86038100`,`86038320`,`86039580` chico);
     **color SAP en col 29** (`000`,`100`,`766`…), el mismo código que el `Horma` del borrador.
   - **Surtidos** (TAB): `… MATNR MODELO COLOR <letras> SURTD`. Familia en `MATNR`, color SAP + letras. Una
     fila por (familia, color, surtido).
   - **Tarifas 906 / 073** (TAB, con filas de cabecera de SAP a ignorar): una fila por **familia** (`MATNR`),
     **sin color**. Podar = quedarse con las familias compradas.
   - **Filtro de color: RESUELTO.** Los 7 códigos SAP comprados salen del `Horma` del borrador (100·BGE,
     766·WGR, 201·DBR, 801·DGY, 860·GHY, 710·WPK, 001·NBK) y casan con la col `COLOR` de materiales/surtidos.
   - **Señal de "comprado" reforzada:** además de `Suma`>0, el borrador marca los no comprados con
     `CONTINUATIVOS` en la descripción.
4. **⚠ LA INCÓGNITA REAL (bloquea materiales y tarifas): ¿cómo se identifica la FAMILIA comprada?** De las 6
   familias, hay que quedarse con `76034250` (chica) y `86038320` (chico) — Silvia las nombró en el correo,
   **pero ese número de 8 dígitos NO está en el borrador** (que sólo trae la ref color a color, `7613425`). Se
   *podría* derivar con una transformación posicional de la ref (`7613425`→`76034250`), pero es un atajo
   frágil que se rompería callado con otro modelo — **no se hace sin confirmar**. Opciones:
   - (a) Preguntar a **Silvia** cómo sabe ella cuál es la familia de la temporada (¿la lee del prepedido, de
     SAP, del código de la ref?).
   - (b) Buscar si otro export de prepedidos trae la familia de 8 dígitos directamente.
   - **Surtidos NO tiene este problema:** su `MATNR` ya es la familia, y se cruza por (familia + color) contra
     lo comprado. Se puede empezar por surtidos mientras se resuelve lo de la familia.
2. **Formato exacto de cada `.txt` de SAP** (columnas, delimitador, posiciones): materiales, `906`, `073`,
   surtidos. Hay ya un fichero de surtidos de ejemplo en `docs/requerimientos/` de otro modelo.
3. **Red de seguridad:** necesitamos, de cada tipo de fichero, un ejemplo **cerrado** — el crudo de entrada y
   el **podado a mano por Silvia** (el resultado esperado) — para validar contra la verdad, como hicimos con
   los pedidos reales de etiquetas. Sin eso, no sabríamos si la poda miente.
4. ¿La identidad de "lo comprado" es **(ref + color)**, o entra también la talla/surtido? En surtidos parece
   que sí importan los colores; confirmar el grano.

## Próximos pasos

1. ~~**Verificar si el maestro ya tiene el código de color SAP** (100, 766…).~~ ✅ **Hecho (21/07):** no lo
   tiene, pero **no hace falta** — se cruza por `ref` (`MATNR`), que está en todos lados. Ver riesgo 1.
2. **Pedir a Silvia un ejemplo cerrado** (crudo + su versión podada a mano) de cada fichero: materiales,
   tarifas `906`/`073` y surtidos. Es la red de seguridad.
3. **Especificar el formato** de cada `.txt` de SAP (columnas / delimitador / posiciones).
4. **Diseñar el motor de poda** (dominio de filtrado + lectura del borrador) — una vez resueltos 1-3.
5. Guardar los adjuntos del correo «FUNCIONES» en `docs/requerimientos/` como material del REQ.

> **Nota:** este documento es el análisis de negocio+arquitectura. NO se implementa nada hasta que Pablo
> valide, y hasta resolver el punto 1 (el mapeo de color), que es el que dice si el REQ es viable tal cual o
> necesita antes una fuente de datos que hoy no tenemos.
