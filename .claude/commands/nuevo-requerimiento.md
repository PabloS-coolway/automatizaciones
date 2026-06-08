---
description: Registra y diseña un nuevo requerimiento de Yorga (negocio + arquitectura antes de implementar)
argument-hint: <descripción breve del requerimiento>
---

Vas a procesar un nuevo requerimiento para Grupo Yorga. El requerimiento es:

> $ARGUMENTS

Sigue este ritual SIEMPRE, en orden, sin saltarte pasos y SIN bajar a implementación:

## 1. Cargar contexto (obligatorio antes de opinar)
Lee, en este orden, para fundamentar el análisis:
- `docs/` → busca cualquier material relacionado que ya nos hayan enviado (briefs, exports, docs de sistemas). Si hay algo relevante, cítalo.
- `diseño/00-contexto-negocio.md` → encaje con marcas/sociedades/canales.
- `diseño/01-mapa-tecnologico.md` → qué sistemas existen hoy y son fuente de la verdad.
- `diseño/02-arquitectura-objetivo.md` → principios y capas con los que debe ser coherente.

Si falta información crítica para diseñar (sistema fuente desconocido, dato sin dueño claro), PREGUNTA antes de inventar.

## 2. Registrar en el backlog
- Abre `diseño/03-backlog-requerimientos.md`, calcula el siguiente `REQ-XXX` (mira los existentes), y añade una fila con estado `🔍 En análisis`.

## 3. Analizar a nivel negocio + arquitectura
Responde explícitamente:
- **Problema de negocio:** qué duele y a quién (marca, sociedad, canal).
- **Sistemas afectados:** qué sistemas del mapa toca; qué dato consume y qué dato produce; quién es el dueño del dato.
- **Encaje arquitectónico:** en qué dominio y capa cae; si respeta los principios (1 fuente de verdad, integrar no reescribir, eventos, dato primero). Señala fricciones.
- **Opciones:** si hay más de un camino, da 2-3 con trade-offs y una recomendación.
- **Preguntas abiertas / riesgos.**

## 4. Andamiar la iniciativa
Crea `diseño/iniciativas/REQ-XXX-<slug>/diseño.md` con el análisis del paso 3, usando esta estructura:

```
# REQ-XXX · <título>
- Estado: 🔍 En análisis · Fecha: <hoy>
- Área: <Stock/Catálogo/BI/Marketing/Ops>

## Problema de negocio
## Sistemas afectados (entradas / salidas / dueño del dato)
## Encaje arquitectónico
## Opciones y recomendación
## Preguntas abiertas y riesgos
## Próximos pasos
```

## 5. Cerrar el turno
Resume al usuario el análisis y termina con una **pregunta o recomendación de próximo paso**.
NO escribas código ni diseñes la implementación técnica hasta que el usuario valide el diseño de negocio+arquitectura.
