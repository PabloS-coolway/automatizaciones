# Fuente · Email Silvia Mayordomo — Colección, plantillas de ventas y etiquetas (COOLWAY)

- **De:** Silvia Mayordomo <silviam@grupoyorga.com> (Directora de Finanzas y Marketing)
- **Fecha:** 7 de junio de 2026, 12:38
- **Cc:** carlos@coolway.com, David Nicolás Soto <nico@coolway.com>
- **Asunto:** PROYECTO. CREACION DE COLECCION, PLANTILLAS DE VENTAS Y FICHERO DE ETIQUETAS
- **Adjuntos referidos (pendientes de subir a `docs/coolway/ficheros-ejemplo/`):**
  capturas PREPEDIDOS y ACCESS; fichero modelos/colores/proveedor/sociedad; ficheros tarifas-clientes / PVP / surtidos; plantilla ventas nacional e internacional; fichero par+bulto pedido 4603187 (CODE128+EAN, 8444 pares); fichero par+bulto pedido 4603292 (UPC+EAN, 53 pares); PDF pedido 4603418 + Excel maestro + fichero IA devuelto (NILO BRW, pares sueltos).

---

## Cuerpo del email (verbatim)

Pablo,

Voy a empezar con la parte de crear colección COOLWAY.

Como ahora tiendas (YORGA sistema 400) y distribución (Vanyor sistema Sap) tienen sistemas diferentes pero compartimos almacén y modelos, tengo que crear las referencias en prepedidos (una especie de desarrollo tipo excel, donde se hacen las compras para tiendas, genera las referencias desde un contador del 400 y cuando se transfieren los pedidos se guardan en 400.

Este sería el pedido que he creado para SS27 de COOLWAY para crear todos los SKU de la colección. Como he hecho compra ficticia del BARESI GRY en surt.I y talla 42 me crea los SKU 7683550-36 hasta 7683550-42. Lo mismo con las tallas de chico pero con SKU que empiezan por 86, Y así con todos los modelos. Solo te deja transferirlos si anteriormente los hemos añadido a Access (Modelo/color/proveedor). Es también desde prepedidos donde se generan los códigos de barras UPC, EAN13 Y CODE128 de cada uno de esos SKU.

PREPEDIDOS: [captura]
ACCESS: [captura]

SUBIR COLECCIÓN A SAP:
Ahora que ya he creado los SKU tengo que subirlos a SAP ya que es VANYOR quien vende la colección.
1º subir modelos/colores/proveedor/sociedad (2000 Vanyor/4000 Coolway USA). Sacamos un fichero desde prepedidos. Adjunto fichero. Y lo subo a SAP. Normalmente me toca modificarlo porque salen todos los colores del modelo aunque no sean de esta campaña.
2º subir tarifas y surtidos a SAP desde ACCESS. Tarifa nacional, internacional, USA, PVP… Si son modelos nuevos es fácil porque filtrando por año y temporada salen tal cual, pero si son continuativos, que pasa mucho con COOLWAY, te sale un fichero con muchas referencias y colores que tenemos que eliminar. Te adjunto los tres ficheros que sacamos y subimos a SAP. 1-Tarifas clientes, 2-PVP solo sale el de nacional, el de internacional sap lo saca automático 10€ más del de nacional, 3-surtidos asociados a esa referencia.

Te explico las referencias. SKU que salen de prepedidos ej.7683550, te dice que la ref.es 76-3550 ya que el tercer digito para tiendas es el color. En SAP, sin embargo, la referencia es 7603550, siempre es cero el tercer digito y añade al final otro cero. A esto le añade el color con tres dígitos, y además otros tres dígitos para el surtido. En tiendas se compra en cajas surtidas, pero se vende en pares sueltos, en VANYOR se vende en cajas surtidas con 8 o 12 pares en diferentes tallas.

7683550-36 en Sap seria 76035500800036 (ref.de par suelto en 36 del BARESI GRY)
Si fuera un surtido I seria 7603550080000I (y esto ya tiene implícito que hay 1.36 2.37 3.38 3.39 2.40 y 1.41 del BARESI GRY).
Cuando subes a SAP los surtidos y las tarifas, se hace un cálculo automático multiplicando el precio unitario por los pares que tiene el surtido.

Una vez esta todo creado, meto todos estos datos a una Excel en el drive de COOLWAY que me sirve a mí de base de datos para SKU, códigos de barra… y a otros departamentos web, marketing, ventas….veras que faltan códigos EAN13 Y UPC ya que todavía no los he generado, más el color de web, que lo añade marketing más adelante.
[Tabla maestra de ejemplo: STYLE, COLOR, REF., SIZE, EAN13, SKU, COLOR NAME WEB, UPC — modelo BARESI GRY, ref. chica 7683550 tallas 36-42, ref. chico 8683955 tallas 40-46]

PLANTILLA VENTAS:
Cuando ya está todo creado, hacemos unas plantillas de ventas para que los repres pasen los pedidos.
Plantilla nacional con surtidos surt.I y KR para chica y surt.P, Z y S46 para chico. y con precios de nacional. La de internacional con el surtido DEI más para chica y con precios de int. La de ITALIA más un surtido en chico GRZ y con precios. Sobre estas creamos el resto de plantillas USA, COSTA RICA, DUBAI…Te adjunto dos plantillas la de nacional e internacional.

[PACK DETAIL — surtidos por talla:
 WOMEN 36-42: 00I-W (1,2,3,3,2,1,0 = 12) · DEI-W (0,1,2,3,3,2,1 = 12) · 0KR-W (1,1,2,2,1,1,0 = 8)
 MEN 40-46: 00Z-M (1,2,3,3,2,1,0 = 12) · 00P-M (1,1,2,2,1,1,0 = 8) · S46-M (...,1 = 1) · GRZ-M (0,1,2,3,3,2,1 = 12)]

Veras que en las plantillas están los pares por surtidos y los precios, con lo que te da el pedido valorado cuando añaden las cajas a pedir. Además en la última columna que pone referencia, está la referencia que metemos en SAP para meter en el sistema los pedidos de venta. Cuando recibimos los pedidos, el departamento de ventas abre cabecera de pedido del cliente, copia las referencias y la cantidad de cajas por referencia y así meten los pedidos en SAP. Una vez lo meten, comprueban que la confirmación de pedido cuadra en pares e importe con la plantilla, ya que las tarifas ya están anteriormente subidas a SAP.
[Ejemplo valorado BARESI GRY: surtidos 00I-W, 0KR-W, 00Z-M, 00P-M, S46-M con precio par 33,33€, PVP 80,00€, FEBRERO-MARZO, refs SAP 7603550080000I / 760355008000KR / 8603955080000Z / 8603955080000P / 86039550800S46]

ETIQUETAS CON CODIGOS DE BARRA:
Las etiquetas se sacan de cada uno de los pedidos de compra. El problema es que la compra esta en SAP y los códigos los sacamos de prepedidos. Hoy todavía me salen diferentes códigos, después de muchos cambios con los informáticos. Prepedidos genera unos a priori y SAP con el pedido de compra genera otros. Tengo que seguir haciendo comprobaciones de cada uno de los ficheros.

Te explico, cuando sacamos la colección generamos los códigos y estos se deberían subir al drive. Cualquier fichero de etiquetas que genere debería coger estos códigos del drive, que son los que pasamos a los clientes antes de pasar pedidos.

Si el pedido es en pares sueltos solo tiene fichero de par, si el pedido es en cajas surtidas, tiene fichero de par y fichero de bultos. El fichero de par depende de lo que le pedimos: SOLO EAN / SOLO UPC / CODE128 Y EAN / UPC Y EAN.

El code128 es la referencia de YORGA+ 5 CEROS + LA TALLA. (BARESI GRY en 36 seria 76835550000036)

Te adjunto un fichero de par y bulto de un pedido 4603187 con CODE128+EAN de 8444 pares que vienen en cajas surtidas.
Te adjunto un fichero de par y bulto de un pedido 4603292 con UPC Y EAN de 53 pares que viene en cajas surtidas.
Los ficheros de par salen de prepedidos poniendo el pedido de compra de SAP; la cantidad sale bien, los códigos no.

Cuando intente hacerlo con IA, le pase la Excel del drive con todos los modelos y le pasaba el PDF de los pedidos de compra.
Te adjunto un pdf de un pedido(4603418), la Excel que le subí como base de datos y el fichero que me devolvió la IA bien. Es un pedido de pares sueltos. S36 equivale a un par al 36 y asi con todas las tallas. Se ve el modelo NILO BRW. La referencia 76033980200S36, que si no hace caso al tercer digito le da la pista de que es NILO BRW 7623398.

### Flujo IA propuesto por Silvia (etiquetas)
Cómo funcionaría:
- Me pasas el PDF del pedido de compra.
- Me pasas el Excel maestro, con una pestaña por modelo.
- Del PDF saco: modelo, color, surtido, tallas, pares por talla dentro del surtido, total de boxes compradas.
- Cálculo: pares por talla del surtido × número de boxes.
- Busco en el Excel, para cada combinación modelo/color/talla: EAN13, UPC, cualquier dato fijo de etiqueta.
- Con eso genero el fichero final de salida.

Ejemplo de salida: style, color, ref., talla, QTY, ean, upc (Runner X White/Blue RX-001 tallas 40-43).

Reglas fijadas:
- No se crean EAN ni UPC nuevos; se usan solo los del Excel maestro.
- Una fila por talla. QTY = cantidad total de pares por talla.
- Los PDFs tienen siempre la misma estructura → extracción robusta.
- Incluye: style, color, ref., talla, SKU (si vacío, generar = REF completa + "-" + talla), QTY, ean13, upc.
- Mantiene: suma de QTY por modelo+color+ref.+talla; orden por style, color, ref., talla.
- surtido DEI = 37 a 42. surtidos I/KR → ref 76. surtidos Z/P → ref 86.
- primero todas las referencias 760 por talla, después todas las 860 por talla.
- No podía leer desde el drive; hubo que mandarle la Excel de referencias.

Cosas a tener en cuenta:
- Ref. del PDF = la de SAP; en el drive es la de YORGA, que es la que realmente necesitamos (es el SKU).
- Con el mismo modelo NILO BRW hay tallas 40,41,42 tanto en ref. chica (76) como chico (86). Los EAN13 son diferentes, los UPC son iguales. Cajas surtidas chica 36-42 (ref.76) y chico 40-46 (ref.86) → esas 3 tallas coinciden. Los clientes no pueden tener distintos SKU con mismos códigos de barra. En el 400 no hay campos para todas las tallas 36-46 → toca hacer dos referencias y de ahí el problema.

Errores que cometía la IA:
- No encontraba UPC de talla 41 y 42 (coincidían, no estaban rellenos) → regla: si falta, copiar el de la ref. de chico.
- Copiaba dos líneas con misma talla en distintos surtidos → terminó sumándolos en una única línea.
- Con varios pedidos hacía una única Excel → regla: una Excel por pedido.
- El surt.DEI lo sumaba del 36 al 41, cuando es del 37 al 42.
- Mezclaba ref.: todo venía con ref. chica en el PDF y devolvía hasta el 39 con 76 y 40-41 con 86 (confundía la norma de respetar UPC con usar ref. incorrecta).
- Regla code128: "code128 = ref + 00000 + talla".

Ya empezó a funcionar bastante bien y sacó varios pedidos sin rectificar, hasta que grabó skill reutilizable.

### Resumen / alcance (priorización de Silvia)
1. Automatizar base de datos que puedan ver diferentes departamentos. Puede haber modificaciones al principio → automatizarlo en un momento determinado DESPUÉS de sacar la colección, no cuando se crean.
2. Ficheros de materiales, tarifas y surtidos.
3. Plantillas de ventas.
4. Fichero de etiquetas.

Semana que viene pasará más: gestión de email, listados de stocks, listados de ventas.

Un saludo, Silvia Mayordomo
