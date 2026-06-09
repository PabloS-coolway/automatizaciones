# Borrador de correo · Pablo → Silvia (REQ-001)

**Asunto:** RE: PROYECTO. Creación de colección, plantillas de ventas y fichero de etiquetas

---

Hola Silvia,

Mil gracias por el correo. Lejos de estar desordenado, me has dado justo el contexto comercial que hacía falta para entenderlo. Ya tengo una imagen clara del flujo —Prepedidos/400 para tiendas, SAP para Vanyor, Access y el Excel del Drive como base de datos— y de los cuatro bloques: base de datos, ficheros para SAP, plantillas de ventas y fichero de etiquetas.

Mi plan es **empezar por el fichero de etiquetas**, que es lo más concreto y lo que ya habías avanzado con IA, pero construyéndolo de forma que el Excel del Drive quede como **única fuente de verdad** de los códigos. Así esa primera entrega nos deja además ordenada la base de datos, que es tu punto 1.

Para arrancar con buen pie necesito que me confirmes unas cosas:

1. **El código "oficial".** Cuando pasáis los códigos a un cliente y cuando se imprime la etiqueta, ¿el bueno es **siempre el del Drive** (el que sale de Prepedidos)? ¿Hay algún caso en que uséis el que genera SAP en el pedido de compra?

2. **El Excel maestro.** ¿Está siempre actualizado y completo justo antes de sacar etiquetas, y quién lo mantiene? Cuando dices que al principio hay modificaciones, ¿en qué momento se puede dar la colección por **cerrada/congelada** para automatizar con seguridad? ¿Está en Google Sheets o es un Excel en Drive? ¿Me puedes dar acceso a una copia?

3. **Tallas en dos surtidos.** Si en un mismo pedido una talla aparece en dos cajas/surtidos distintos, en el fichero de etiquetas ¿quieres **una sola línea sumando** las cantidades (como hiciste con la IA) o una línea por surtido?

4. **Volumen y ritmo.** ¿Cuántas colecciones sacáis al año y cuántos pedidos necesitan etiquetas por temporada? ¿Hay picos? (Me sirve para decidir si es una herramienta sencilla para ti o algo más automático.)

5. **Resto de marcas.** Este flujo (Prepedidos → 400 → SAP → Drive) ¿es igual en Ulanka y Musse & Cloud, o cada marca va a su manera?

6. **Detalle de las etiquetas.** Las variantes (SOLO EAN / SOLO UPC / CODE128+EAN / UPC+EAN), ¿quién decide cuál se usa en cada pedido, el cliente? ¿El PDF del pedido de compra de SAP tiene siempre la misma estructura? Y si puedes, **mándame 2–3 pedidos más con su fichero de etiquetas correcto** —a poder ser alguno de cajas surtidas además de pares sueltos—; me sirven para validar.

7. **Formato del fichero final.** Veo dos formatos distintos en lo que me pasaste: el que sale de prepedidos (con columnas EAN, CODE128, REF, PROVIDER, ORDER…) y el más sencillo que te devolvió la IA (ref, talla, SKU, ean13, upc). **¿Cuál es el que de verdad necesita la etiquetadora / el cliente?** Y en el de prepedidos, ¿de dónde sale el PROVIDER (ej. 995) y el ORDER, y cómo se forma el código de barras del bulto?

Hay un par de cosas más técnicas (por qué Prepedidos y SAP generan códigos distintos, y si los sistemas tienen forma de extraer datos automáticamente) que prefiero ver directamente con los informáticos del 400/SAP; si me dices con quién hablo, me organizo.

Mientras tanto voy avanzando con los ficheros que ya me pasaste, para enseñarte cuanto antes un primer prototipo funcionando.

Un abrazo,
Pablo
