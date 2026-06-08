# 02 · Arquitectura objetivo (visión)

> Hacia dónde queremos llevar la tecnología de Yorga. Es una **brújula, no un plan cerrado**:
> guía cada decisión de automatización para que sumen a un sistema coherente, no a un archipiélago de parches.

## Principios

1. **Una fuente de la verdad por dominio.** Cada dato tiene un sistema dueño. El resto consume, no duplica.
2. **Integrar, no reescribir.** Aprovechamos ERP/POS existentes; añadimos capas de conexión y datos por encima.
3. **Desacoplar por eventos.** Las automatizaciones reaccionan a eventos de negocio (venta, recepción, devolución), no a sincronizaciones frágiles punto-a-punto.
4. **Empezar por el dato, no por la app.** Si los datos están consolidados y limpios, las automatizaciones y el BI salen casi solos.
5. **Visión de grupo sobre silos de marca.** El dato fluye a nivel grupo aunque las marcas operen por separado.

## Capas objetivo

```
┌─────────────────────────────────────────────────────────────┐
│  CONSUMO        BI / Dashboards · Apps · Automatizaciones     │
├─────────────────────────────────────────────────────────────┤
│  DATOS          Data Warehouse / Lakehouse (verdad de grupo)  │
│                 + PIM (catálogo unificado)                    │
├─────────────────────────────────────────────────────────────┤
│  INTEGRACIÓN    Bus de eventos / iPaaS · APIs · conectores    │
├─────────────────────────────────────────────────────────────┤
│  SISTEMAS       ERP · POS/TPV · E-commerce · WMS · CRM        │
│  FUENTE         (lo que ya existe — se integra, no se tira)   │
└─────────────────────────────────────────────────────────────┘
```

## Dominios (descomposición por negocio)

| Dominio | Fuente de la verdad (candidata) | Automatizaciones típicas |
|---|---|---|
| **Inventario / Stock** | ERP + POS | Reposición, alertas de rotura de talla, stock omnicanal |
| **Catálogo / Producto** | PIM (a crear si no existe) | Sync catálogo → e-commerce + marketplaces |
| **Pedidos / OMS** | E-commerce + POS | Ship-from-store, click&collect, devoluciones |
| **Cliente / CRM** | CRM | Fidelización, segmentación, campañas |
| **Analítica / BI** | Data Warehouse | Reporting de grupo, KPIs por marca/tienda |

## Decisiones arquitectónicas (ADR log)

> Registramos aquí cada decisión técnica relevante con su porqué. Formato ligero.

### ADR-000 · Adoptar modelo "cerebro compartido + diseño antes de implementar"
- **Estado:** aceptado · 2026-06-08
- **Contexto:** grupo multi-marca/multi-sociedad, infraestructura aún sin mapear, CTO recién incorporado.
- **Decisión:** centralizar contexto, negocio y arquitectura en este repo; cada requerimiento pasa por diseño antes de build.
- **Consecuencia:** algo más de fricción inicial, pero coherencia y trazabilidad a cambio.

_(Próximos ADR conforme tomemos decisiones reales: elección de DWH, iPaaS, PIM, etc.)_
