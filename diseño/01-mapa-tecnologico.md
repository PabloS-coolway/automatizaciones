# 01 · Mapa tecnológico actual

> **Estado: EN DESCUBRIMIENTO.** Plantilla para mapear el "as-is".
> Cada sistema que descubras lo registras aquí. Sin este mapa no diseñamos integraciones.

## Cómo rellenar

Para cada sistema responde: **qué hace, quién lo usa, qué datos son suyos (fuente de la verdad),
cómo se accede (API/DB/export), y qué marcas/sociedades cubre.**

## Inventario de sistemas

### ERP / Gestión
| Campo | Valor |
|---|---|
| Sistema | _(pendiente: ej. SAP, Dynamics, Sage, Navision…)_ |
| Cobertura | _(¿todas las sociedades? ¿una por marca?)_ |
| Datos dueños | _(maestro de artículos, compras, facturación, contabilidad…)_ |
| Acceso | _(API REST? acceso a BD? solo exports?)_ |

### TPV / POS (tienda física)
| Campo | Valor |
|---|---|
| Sistema | _(pendiente)_ |
| Cobertura | _(¿mismo POS en las +100 tiendas?)_ |
| Datos dueños | _(tickets de venta, stock por tienda, devoluciones)_ |
| Acceso | _(centralizado en la nube? sincronización batch?)_ |

### E-commerce
| Campo | Valor |
|---|---|
| Plataforma(s) | _(pendiente: por marca)_ |
| Datos dueños | _(catálogo online, pedidos web, clientes web)_ |
| Acceso | _(API)_ |

### PIM / Gestión de catálogo
| Campo | Valor |
|---|---|
| ¿Existe? | _(pendiente — si no, candidato fuerte a crear)_ |

### CRM / Marketing
| Campo | Valor |
|---|---|
| Sistema | _(pendiente)_ |

### Logística / Almacén (WMS)
| Campo | Valor |
|---|---|
| Sistema | _(pendiente)_ |

### BI / Reporting
| Campo | Valor |
|---|---|
| Herramienta | _(pendiente: Excel? Power BI? Looker?)_ |

## Diagrama de flujos (a construir)

> Conforme tengamos sistemas, dibujamos aquí cómo fluye el dato hoy
> (y dónde está el trabajo manual / los exports de Excel que duelen).

```
[ERP] --?--> [TPV] --?--> [E-commerce]
   \__ exports manuales __/   (Excel, correos)
```

## Dolores detectados

> Lista viva de los puntos donde hoy hay trabajo manual, datos descuadrados o ceguera.

- [ ] _(pendiente)_
