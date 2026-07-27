# REQ-011 · Surtidos configurables por prefijo de referencia (76/86)
- Estado: 📐 Diseñado (decisiones cerradas) · Fecha: 2026-07-27
- Área: Catálogo (poda SAP · sustituye la Fase 2 de REQ-010)
- Origen: correo de respuesta de Silvia (27/07) sobre poda/surtidos.

## Problema de negocio

La Fase 2 de REQ-010 dejó los surtidos configurables **por referencia** (`ref → SURTD`, uno a uno). Silvia lo
prueba y dice que es **"un rollo"** relacionar todas las referencias. Lo quiere **más general, como la
sociedad**: definir los surtidos **por prefijo de referencia** — las `76*` (chica) con unos surtidos y las
`86*` (chico) con otros —, dar de alta los que suele usar y poder añadir más a futuro.

## Qué cambia respecto a REQ-010 Fase 2

De **por-referencia** → **por-grupo de prefijo**. La tabla `surtido` (ref→SURTD) y su pantalla por-ref
**se reemplazan** (están vacías en prod → sin coste de datos). El resto de la poda (materiales, tarifas,
sociedad, aviso de color BUG-006) **no se toca**.

## Decisiones cerradas (con Pablo, 27/07)

1. **Modelo por prefijo**, no por referencia. Grupos: `76` (chica) y `86` (chico), **extensibles** (de momento
   sólo esos dos).
2. **Se activa al podar** (como la sociedad): un control en *Podar SAP* aplica el filtro de surtidos usando el
   catálogo por prefijo. Sin activarlo, se conservan todos (comportamiento actual).
3. **Catálogo gestionable y ampliable** desde la web. Se **siembra** con las listas que pasó Silvia.
4. Todos los surtidos (SURTD) tienen **3 caracteres**.

## Catálogo inicial (del correo de Silvia)

- **Grupo `76` (chica):** `00I, 0KR, 00D, 00E, 00L, 00M, 00N, DE4, S36, S37, S38, S39, S40, S41, S42, M36,
  M37, M38, M39, M40, M41, M42`.
- **Grupo `86` (chico):** `00Z, 00P, 00Y, 00R, 00S, 00T, S40, S41, S42, S43, S44, S45, S46, M40, M41, M42,
  M43, M44, M45, M46`.

*(Algunos códigos —S40–S42, M40–M42— están en ambos grupos: el modelo lo permite.)*

## Sistemas afectados (entradas / salidas / dueño)

- **Dato nuevo:** catálogo de surtidos por grupo — `poda_surtido (grupo, codigo)`, único por `(grupo, codigo)`.
  Dueño: Silvia (lo gestiona desde la web, patrón REQ-004). Mutaciones **auditadas** (REQ-007).
- **Al podar:** para cada línea del fichero de surtidos, el **prefijo de su familia** (2 primeros dígitos:
  76/86) decide el grupo; se conserva sólo si su `SURTD` está en el catálogo de ese grupo — **además** de estar
  comprada (familia+color), como ya hace. **Ventaja:** ya no hace falta el cruce `(familia,color)→ref` del
  borrador; el prefijo está en la propia familia del fichero. Más simple y más rápido.

## Encaje arquitectónico

- **Migración:** `DROP TABLE surtido` (per-ref, vacía) + `CREATE TABLE poda_surtido` + **seed** de las listas
  de arriba. Aditivo/seguro (la vieja no tiene datos en prod).
- **Dominio poda:** el predicado de surtido pasa de "ref asignada" a "prefijo de familia ∈ grupo". Sigue sin
  componer nada: sólo deja pasar el elegido.
- **API:** se **reharía el módulo `surtidos/`** (grupo/codigo en vez de ref/surtido): puerto, repo, service
  (alta/baja de un código en un grupo, auditado), controller. `POST /poda` gana un flag `aplicarSurtidos`.
- **Web:** la pantalla **Surtidos** se rehace a **dos listas (76 / 86)** con alta/quita de códigos; *Podar SAP*
  gana el control **"aplicar surtidos"**.

## Regla del proyecto

- **"¿Cómo me enteraría si miente?"** El filtro por prefijo debe validar (código de 3 chars, grupo conocido) y
  no inventar. Un prefijo sin catálogo → no se filtra ese grupo (opt-in), no se anula en silencio.

## Próximos pasos (implementación)

1. Migración: reemplazar `surtido` por `poda_surtido` + seed.
2. Dominio: filtro de surtido **por prefijo de familia** + test (break-on-purpose).
3. Rehacer módulo `surtidos/` (grupo/codigo, auditado) + contratos.
4. Poda: flag `aplicarSurtidos` + integración por prefijo.
5. Front: pantalla Surtidos (dos listas) + toggle en Podar SAP.
6. Puerta de calidad + verificación en vivo con el Excel nuevo.
