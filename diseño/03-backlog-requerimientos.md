# 03 · Backlog de requerimientos

> Cola de entrada. Tú me pasas requerimientos aquí; yo los gestiono y maduro.
> Ciclo de vida: **🆕 Nuevo → 🔍 En análisis (negocio+arquitectura) → 📐 Diseñado → 🛠 En implementación → ✅ Hecho**

## Cómo registramos un requerimiento

Cada entrada lleva: id, título, área, una frase de qué se pide, y estado.
Cuando madura, se le crea su carpeta en `diseño/iniciativas/REQ-XXX-nombre/` con el diseño detallado.

## Tabla

| ID | Título | Área | Estado | Resumen |
|----|--------|------|--------|---------|
| REQ-001 | Creación de colección COOLWAY: BD maestra, ficheros SAP, plantillas y etiquetas | Catálogo | 🔍 En análisis | Epic de 4 sub-entregables (BD maestra → tarifas/surtidos → plantillas ventas → etiquetas) que hoy hace Silvia a mano puenteando Prepedidos/400, Access, SAP y Drive. Diseño: [`iniciativas/REQ-001-coleccion-coolway/`](iniciativas/REQ-001-coleccion-coolway/diseño.md) |

---

### Plantilla de entrada (copiar al añadir)

```
| REQ-001 | <título> | Stock/Catálogo/BI/Marketing/Ops | 🆕 Nuevo | <una frase> |
```
