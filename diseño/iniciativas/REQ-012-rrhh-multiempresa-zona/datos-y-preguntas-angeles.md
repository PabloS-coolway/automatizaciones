# REQ-012 · Lectura de los datos de Ángeles + preguntas / borrador de respuesta

## Qué contiene su Excel (`REGISTRO HORARIO PRUEBA.xlsx`)
**18 trabajadores** en 1 departamento + 2 tiendas de 2 zonas, de **4 sociedades**:

| Sociedad (nº) | Nombre | Dónde |
|---|---|---|
| 16 | VANYOR SAU | Sistemas (Robert) |
| 12 | YORGA SAU | Sistemas (Tomas, Juanmi) |
| 105 | MAYUKA SLU | Tienda SUC.01 Ulanka · **Valencia** (6) |
| 120 | YORGA, S.A.U | Tienda **Las Palmas-Canarias** (9) |

- **Departamento Sistemas** (3): mezcla sociedades **16 y 12** → confirma que la empresa va **por empleado**, no por grupo.
- **Tienda Valencia** (105, 6 personas): 1 Encargada P.EX + 1 2ª Encargada + 4 Ay. Dependientes.
- **Tienda Las Palmas** (120, 9 personas): Jefe de Zona + Encargada + 2ª Encargada + Dependientes + Ay. Dptes.
- Códigos de **contrato** vistos: 100, 200, 500, 502, 510. **Secciones**: INFORM, 87, 500, 01, 86 (mezcla letra/número).

## Avisos de calidad del dato (a normalizar en el import)
1. **Nombres de sociedad inconsistentes:** `YORGA SAU` (nº 12) vs `YORGA, S.A.U` (nº 120) — **códigos distintos** → son sociedades distintas (o hay que confirmar). **Normalizamos por CÓDIGO de empresa, no por nombre.**
2. **La zona (AREA/ZONA) solo viene en la 1ª fila** de cada grupo de tienda → el import la **arrastra** al resto del grupo. **Sistemas no tiene zona** (es departamento, no tienda) → ¿los servicios centrales tienen convenio propio?
3. **Categoría, código de contrato y código de sección** llegan como texto → los volcamos a **catálogos** (para que sean gestionables y consistentes).

---

## Borrador de respuesta para Ángeles (para cuando Pablo lo mande)

> Hola Ángeles,
>
> Perfecto, con lo que me has mandado ya podemos **ir avanzando la aplicación sin esperarte** y sin rehacer:
> voy a dejar montada toda la estructura (empresa/sociedad, zona, tienda, la ficha con los datos en amarillo —
> nº de empresa, nº de empleado, empresa y zona— y el importador de tu Excel para cargar estos trabajadores).
> La prueba real la dejamos para tu vuelta, como dijiste.
>
> Para que a tu vuelta sea **solo rellenar y probar** (y no rehacer), necesito de ti tres cosas cuando puedas,
> sin prisa:
>
> 1. **El mapa de convenio → permisos** (lo más importante que señalaste): por cada **zona/convenio**, qué
>    **permisos** concede y con **cuántos días / condiciones**. Es lo que hoy "los trabajadores dejan plasmado en
>    el registro actual" — si me pasas esa tabla (aunque sea del sistema viejo), la cargamos tal cual.
> 2. **El volcado**: ¿desde qué sistema salen los datos de altas y bajas, y en qué formato (Excel como este, o
>    algún fichero/exportación automática)? Así preparo la sincronización sin inventar.
> 3. **La jerarquía**: ¿cómo se anidan empresa ↔ tienda ↔ departamento ↔ sección? Y una duda del propio Excel:
>    "YORGA SAU" (nº 12) y "YORGA, S.A.U" (nº 120), ¿son dos sociedades distintas? (los normalizo por su número).
>
> Con eso, a tu vuelta cargamos tus tiendas reales, activamos los permisos por convenio y lo probamos en
> paralelo con el sistema actual los dos meses que comentabas. Y sí: el dato se conserva **6 años** y se podrá
> exportar/presentar a requerimiento.
>
> Un saludo — cualquier cosa, aquí estoy.
