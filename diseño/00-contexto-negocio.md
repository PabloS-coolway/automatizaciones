# 00 · Contexto de negocio — Grupo Yorga

> Base para entender qué automatizamos y por qué. Se actualiza conforme aprendemos.

## Qué es Yorga

Conglomerado familiar valenciano de **distribución y comercio de calzado y moda**.
Sede central: Polígono Industrial Fuente del Jarro (Paterna, València).
Opera a través de **varias sociedades** y es un actor de referencia del sector.

## Portafolio de marcas

| Marca | Posicionamiento | Notas |
|---|---|---|
| **Ulanka** | Cadena principal multimarca de calzado | +100 puntos de venta en España |
| **ULK** | Concepto insignia urbano de Ulanka | Calzado + moda *ready-to-wear* H/M. Flagship: C/ Don Juan de Austria 9, València |
| **Coolway** | Marca propia: siluetas retro, sneakers, moda urbana | Público joven |
| **Legit Sneaker House** | Formato multimarca | Orientado a Generación Z |
| **Musse & Cloud** | Marca propia de calzado femenino | — |

## Canales

- **Retail físico:** +100 tiendas (cadenas propias + córners en CC como Bonaire, Nuevo Centro).
- **E-commerce:** tiendas online por marca (a confirmar alcance y plataforma).
- **Marketplaces / wholesale:** a confirmar.

## Características del sector (implicaciones técnicas)

- **Tallaje:** cada modelo se multiplica por tallas → la unidad de stock real (SKU) explota.
  La reposición y la rotura de tallas es el dolor clásico del calzado.
- **Estacionalidad y colecciones:** ciclos de temporada marcan compras, rebajas y liquidación.
- **Multi-marca + multi-sociedad:** datos fragmentados por entidad legal y por marca →
  consolidar para tener visión de grupo es un reto transversal.
- **Omnicanal:** el cliente espera comprar online / recoger en tienda / devolver donde sea →
  exige stock unificado y visión única de cliente.

## Preguntas abiertas (a resolver con el negocio)

- [ ] ¿Qué sociedades existen y cómo se reparten las marcas entre ellas?
- [ ] ¿Hay ERP central único o uno por sociedad/marca?
- [ ] ¿Plataforma(s) de e-commerce? (Shopify, Magento, PrestaShop, a medida…)
- [ ] ¿Cuál es el TPV/POS en tienda y qué datos expone?
- [ ] ¿Existe almacén central único o logística distribuida?
- [ ] ¿Hay equipo técnico interno hoy, o todo es externo/proveedores?
