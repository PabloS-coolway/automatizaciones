# REQ-004 · Destinos gestionables desde la web (CRUD)

- Estado: ✅ Implementado · Fecha: 2026-07-16
- Área: Catálogo

## Problema de negocio

El **destino** de un pedido decide dos cosas de la etiqueta:

1. **Qué códigos lleva** (la *variante*): Valencia = CODE128+EAN · USA = UPC+EAN · Australia = UPC ·
   Italia/UK/Costa Rica = sólo EAN.
2. **El "importado por"** que se imprime: `VANYOR S.A.U`, `COOLWAY USA LLC`, o el cliente/país.

Hoy esos 6 destinos viven **en el código** ([`packages/contracts/src/markets.ts`](../../../packages/contracts/src/markets.ts)).
Consecuencia: **abrir un cliente nuevo, corregir una razón social o cambiar los códigos de un país exige
tocar el repositorio y desplegar**. Silvia depende del CTO para un dato que es **suyo**.

Y no es hipotético: el propio REQ-001 ya lo dice — *RF-14: preset destino → variante, **decide Yorga, a
veces el cliente***. Es una decisión **comercial**, que cambia al ritmo del negocio (nuevos distribuidores,
nuevos países), no al ritmo de los despliegues.

**A quién duele:** a Silvia (espera a que alguien despliegue) y al CTO (interrumpido para un cambio de
texto). El coste real no es el despliegue: es que **un dato de negocio esté secuestrado en el código**.

## Sistemas afectados (entradas / salidas / dueño del dato)

| | |
|---|---|
| **Sistemas del mapa** | Ninguno externo. Sólo la app `etiquetas-coolway` (web + API + Postgres). |
| **Dato que consume** | Ninguno nuevo: los 6 destinos actuales se migran tal cual desde el código. |
| **Dato que produce** | **El catálogo de destinos**: código, nombre, variante e "importado por". |
| **Dueño del dato** | **Nuevo dueño explícito: la app** (como ya pasa con el maestro y los usuarios). Hoy el dueño es *de facto* el repositorio de código, que es el problema. |

⚠️ **Ojo con el matiz de propiedad:** el destino NO es dato de SAP ni del maestro de códigos. Es una
**decisión comercial de Yorga**. Por eso puede vivir en nuestra BD sin violar el principio de "una fuente
de la verdad por dominio": no estamos duplicando nada de nadie, estamos **dándole casa a un dato que hoy
no la tiene**.

## Encaje arquitectónico

Cae en **Catálogo**, capa de datos + consumo. Es un CRUD clásico, y el patrón **ya existe en el repo**:
la pantalla de **Usuarios** hace exactamente esto (listar, crear, editar, con rol admin). Se reutiliza:
tabla Postgres + Prisma, puerto/repositorio, controlador con `@Roles('admin')`, y la `DataTable` de REQ-002.

Respeta los principios: no duplica dato, no reescribe nada, y **refuerza "dato primero"** — saca de código
algo que es dato.

### Fricciones reales (y son las que decidirán el diseño)

1. **La variante NO puede ser texto libre.** `CODE128_EAN`, `UPC_EAN`, `UPC`, `EAN` son las cuatro que el
   motor sabe construir. Si Silvia pudiera escribir "UPC+EAN13", el generador no lo entendería. Debe ser
   un **desplegable cerrado** con las variantes que existen en el código. *(Añadir una variante nueva sí
   es trabajo de desarrollo: implica saber qué códigos imprimir.)*
2. **Borrar un destino es delicado.** No rompe pedidos ya generados (el "importado por" queda escrito en
   el Excel), pero sí puede confundir. Propuesta: **desactivar en vez de borrar** (como los usuarios, que
   tienen `activo`). Un destino desactivado no aparece al generar, pero no se pierde el histórico.
3. **El `MarketCode` es hoy un tipo de TypeScript.** Al pasar a BD, el código deja de ser un tipo cerrado
   y pasa a ser un `string` validado en tiempo de ejecución. Es lo correcto (el dato manda), pero hay que
   **mantener el error claro** que ya existe: *"Mercado desconocido: X. Válidos: …"*.
4. **La CLI también los usa** (`generate-labels.command.ts`): debe leerlos de la BD igual que la API.

## Opciones y recomendación

### Opción A — Destinos en la BD, con CRUD en la web ✅ **recomendada**
Tabla `destination` (código, nombre, variante, importadoPor, activo). Migración que **siembra los 6
actuales** desde el código, así nada cambia el día del despliegue. Pantalla de administración (sólo admin),
como la de Usuarios. La variante, desplegable cerrado.
- ✅ Silvia gestiona su dato **sin depender de nadie**. Es el objetivo.
- ✅ Reutiliza patrón, componentes y guardas que ya existen: es de las cosas más baratas que hemos hecho.
- ❌ Toca API, BD y web. Y hay que migrar los 6 sin romper lo que funciona (mitigado con la siembra).

### Opción B — Dejarlo en código y añadirlos a demanda
- ✅ Coste cero hoy.
- ❌ **No resuelve el problema**: cada cliente nuevo sigue siendo un despliegue. Y el ritmo de apertura de
  distribuidores no lo marcamos nosotros.

### Opción C — Un fichero de configuración editable (JSON/Excel subido)
- ✅ Sin migración.
- ❌ Otro fichero suelto que gobernar, sin validación ni permisos, y sin histórico. Repetiríamos el problema
  del maestro **antes** de meterlo en la BD. Un paso atrás.

**Recomendación: opción A**, con dos decisiones de producto que la hacen segura:
- **desactivar, no borrar** (preserva histórico y evita romper nada);
- **la variante es un desplegable cerrado**, nunca texto libre.

## Preguntas abiertas y riesgos

1. **¿Quién puede tocar los destinos?** Propongo **sólo admin** (como el maestro y los usuarios): decide
   qué códigos lleva una etiqueta, y equivocarse imprime códigos que no son.
2. **¿El "importado por" es siempre texto libre?** Hoy sí (`VANYOR S.A.U`, `Australia`…). Se mantiene libre:
   es una razón social o el nombre del cliente, y no hay lista cerrada posible.
3. **¿Hace falta "nombre" además de "código"?** Hoy sólo hay código (`COSTA_RICA`) y se muestra tal cual en
   el desplegable. Añadir un nombre legible (*"Costa Rica"*) es barato y mejora la pantalla. **Propongo sí.**
4. **Riesgo — cambiar la variante de un destino existente** afecta a las etiquetas que se generen a partir
   de ese momento. Es el poder que se le está dando a Silvia, y es deliberado; pero conviene que la pantalla
   diga **con qué códigos sale cada destino**, para que el efecto sea evidente antes de guardar.
5. **Riesgo bajo (histórico):** los pedidos ya generados no se ven afectados — el "importado por" viaja
   escrito en el Excel, no se recalcula.

## Próximos pasos

1. Validar con Pablo: **desactivar vs borrar**, si añadimos **nombre legible**, y que el CRUD sea **sólo admin**.
2. Con eso, detallar: migración + siembra de los 6, contrato de la API, y la pantalla (reutilizando
   `DataTable` y el patrón de Usuarios).
3. Recién entonces, implementar. Y **verificar que los 6 destinos actuales siguen generando igual** que hoy
   (los pedidos de prueba de `ESTADO.md` son la red de seguridad).
