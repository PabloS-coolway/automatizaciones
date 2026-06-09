# REQ-001 · Diagramas de flujo

- **Fecha:** 2026-06-08 · **Relacionado:** [`diseño.md`](diseño.md) · [`prd/prd-fase1-etiquetas.md`](prd/prd-fase1-etiquetas.md)
- Diagramas como imagen (se ven en cualquier sitio). El código Mermaid editable está plegado bajo cada uno. 🔴 = punto de dolor actual · 🟡 = pendiente de decidir.

---

## 1. AS-IS — Proceso completo de colección (hoy, manual)

> Silvia hace de "bus de integración humano" entre 4 sistemas que no se hablan. El dolor raíz:
> los códigos de barra los genera Prepedidos **y** SAP por separado → **no cuadran**.

![Diagrama AS-IS del proceso de colección](diagramas/diagrama-1.png)

**Dolores marcados:**
- 🔴 SAP regenera códigos ≠ Prepedidos → descuadre.
- 🔴 El fichero de etiquetas hay que comprobarlo a mano, fichero por fichero.

<details><summary>Ver código Mermaid</summary>

```mermaid
flowchart TD
  subgraph ACC[Access]
    B1[Maestro modelo / color / proveedor]
    B2[Tarifas y surtidos]
  end
  subgraph PRE[Prepedidos - desarrollo tipo Excel]
    A1[Compra ficticia de la coleccion]
    A2[Genera SKU desde contador del 400]
    A3[Genera codigos UPC / EAN13 / CODE128]
  end
  subgraph S400[Sistema 400 - tiendas YORGA]
    C2[SKU guardados al transferir]
  end
  subgraph SAP[SAP - Vanyor / distribucion]
    D1[Modelos / colores / sociedad 2000-4000]
    D2[Tarifas y surtidos]
    D3[Pedido de compra - PDF]
    D4[Genera SUS propios codigos]
  end
  subgraph DRV[Drive - Excel REFERENCIAS COOLWAY]
    E1[Base de datos compartida: SKU + codigos]
  end
  PLAN[Plantillas de ventas: surtidos + precios + ref SAP]
  OUT[Fichero de etiquetas: par + bulto]
  CONS[Web / Marketing / Ventas / Clientes]

  B1 -->|requisito previo| A2
  A1 --> A2 --> A3
  A2 --> C2
  A2 -->|fichero modelos| D1
  B2 -->|tarifas/surtidos| D2
  A3 -->|deberian subir| E1
  E1 --> CONS
  E1 --> PLAN
  D2 --> PLAN
  D3 --> OUT
  E1 -->|codigos que se pasan al cliente| OUT
  D4 -. codigos distintos CONFLICTO .-> OUT

  classDef pain fill:#ffe0e0,stroke:#cc0000,color:#000;
  class D4,OUT pain;
```

</details>

---

## 2. TO-BE — Motor de fichero de etiquetas (Fase 1)

> El maestro del Drive es la **única autoridad** de códigos: el motor **busca y lee**, nunca inventa.
> Núcleo de dominio puro; los bordes (PDF / Excel / mañana Drive-API) son adapters intercambiables.

![Diagrama TO-BE del motor de etiquetas](diagramas/diagrama-2.png)

🟡 El **layout exacto** del fichero de salida está pendiente de Silvia (**DEP-06**: formato prepedidos rico vs simplificado).

<details><summary>Ver código Mermaid</summary>

```mermaid
flowchart LR
  IN1[/PDF pedido de compra SAP/]
  IN2[/Maestro REFERENCIAS - Excel Drive/]

  subgraph CORE[Motor de etiquetas - dominio puro + casos de uso]
    P1[1 - Parsear pedido: style / color / surtido / cajas]
    P2[2 - Expandir surtido: pares por talla x cajas = QTY]
    P3[3 - Buscar en maestro por STYLE + COLOR + SIZE + GENERO]
    P4[4 - Leer EAN13 / UPC / CODE128 de la fila]
    P5[5 - Reglas RN-04..06: genero 76-86 / UPC compartido / dedupe por ref-talla]
    P6[6 - Cuadre de pares vs PDF + faltantes]
  end

  O1[Fichero de par - variante EAN, UPC o CODE128]
  O2[Fichero de bultos - si cajas surtidas]
  O3[Informe Resumen - cuadre + avisos]

  IN1 --> P1 --> P2 --> P3
  IN2 --> P3
  P3 --> P4 --> P5 --> P6
  P6 --> O1
  P6 --> O2
  P6 --> O3

  classDef open fill:#fff3cd,stroke:#cc8800,color:#000;
  class O1,O2 open;
```

</details>

### Mapeo a la arquitectura hexagonal
| Paso | Capa | Pieza |
|---|---|---|
| Entradas IN1/IN2 | infraestructura (adapters in) | `pdf-order-reader`, `excel-master-reader` |
| P1–P6 | dominio + aplicación | reglas puras + `generate-labels.use-case` |
| Salidas O1–O3 | infraestructura (adapters out) | `excel-label-writer`, `bulto-writer` |

---

## 3. Mapa del epic REQ-001 (4 fases)

![Mapa del epic REQ-001](diagramas/diagrama-3.png)

> Estrategia (Opción C): la Fase 1 entrega valor ya **y** define el contrato del maestro que necesitan las fases 2-4.

<details><summary>Ver código Mermaid</summary>

```mermaid
flowchart TD
  F1[Fase 1 - Fichero de etiquetas<br/>EMPEZAR AQUI - quick win]
  F2[Fase 2 - BD maestra canonica gobernada]
  F3[Fase 3 - Ficheros materiales / tarifas / surtidos para SAP]
  F4[Fase 4 - Plantillas de ventas]
  DB[(Maestro = unica fuente de verdad)]

  F1 -->|define el contrato de| DB
  DB --> F2
  DB --> F3
  DB --> F4
  F3 -. reutiliza motor de referencias .-> F1

  classDef now fill:#d9f2d9,stroke:#2e7d32,color:#000;
  class F1 now;
```

</details>
