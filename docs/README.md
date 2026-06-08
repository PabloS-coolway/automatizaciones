# docs · Información de origen

Aquí va **toda la información cruda que me envían** (negocio, proveedores, capturas de sistemas,
exports, correos, especificaciones, etc.). Es la **fuente** desde la que diseñamos requerimientos.

## Reglas

- Todo material recibido se guarda aquí, no en la raíz ni suelto.
- Conviene organizar por tema/fecha conforme crezca, p.ej.:
  ```
  docs/
     erp/            # documentación del ERP
    ecommerce/       # plataformas online
    pos/             # TPV
    requerimientos/  # briefs y peticiones tal como llegan
    proveedores/     # propuestas y docs de terceros
  ```
- Cuando se diseñe un requerimiento (`/nuevo-requerimiento`), **se revisa esta carpeta primero**
  para apoyar el análisis en lo que ya nos han pasado.

> Esta carpeta es **input** (lo que recibimos). El diseño y las decisiones viven en `diseño/`.
