# etiquetas-coolway-web

Front mínimo (React + Vite) para generar etiquetas Coolway: sube el/los PDF(s) de pedido SAP + el Excel maestro, elige el destino y descarga los ficheros.

## Desarrollo
```bash
# desde la raíz del monorepo, levanta API + web:
npm run dev            # turbo: api en :3000, web en :5173
# o solo el front (necesita la API en :3000):
npm run dev -w @yorga/etiquetas-coolway-web
```
Vite redirige `/api` → `http://localhost:3000` (la API NestJS).

Consume los tipos de [`@yorga/contracts`](../../packages/contracts/) (destinos, variantes, DTOs).
