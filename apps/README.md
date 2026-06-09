# apps · Código de las automatizaciones

Aquí vive el **código** de las automatizaciones de Yorga. Cada automatización es una subcarpeta propia.

> Límite de responsabilidades del repo:
> - `docs/` → información cruda recibida (input).
> - `diseño/` → el **porqué**: negocio, arquitectura, requerimientos por iniciativa.
> - `apps/` → el **cómo**: el código que implementa lo diseñado.

Es un **monorepo** (npm workspaces + Turborepo). Tipos compartidos en [`../packages/`](../packages/).

## Apps actuales (REQ-001 Coolway)

| App | Qué es |
|---|---|
| [`etiquetas-coolway-api/`](etiquetas-coolway-api/) | NestJS (hexagonal): dominio + reglas, CLI y API HTTP de generación de etiquetas |
| [`etiquetas-coolway-web/`](etiquetas-coolway-web/) | React + Vite: front para subir pedidos+maestro y descargar etiquetas |

## Comandos (desde la raíz)
```bash
npm run dev        # turbo: API (:3000) + web (:5173)
npm test           # turbo: tests de todos los paquetes
npm run build      # turbo: build de todos
```

## Convención
- Una carpeta por app, nombrada por su iniciativa.
- Cada app trae su propio README.
