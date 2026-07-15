# Despliegue · DigitalOcean App Platform

Herramienta interna (etiquetas Coolway) sobre **DigitalOcean App Platform** + **Managed Postgres**.
Topología y decisiones: ver el diseño en el commit que introdujo esto. Aquí va el **paso a paso**.

```
   ┌──────────── etiquetas-coolway (App Platform) ────────────┐
   │  web  →  /       front (build de Vite, servido por CDN)   │
   │  api  →  /api    NestJS (Dockerfile, con poppler-utils)   │
   └───────────────────────────┬──────────────────────────────┘
                               ▼
                  db  ·  Managed Postgres (con backups)
```

Todo está definido en [`.do/app.yaml`](../.do/app.yaml). El front y la API viven bajo el **mismo dominio**;
`/api/*` va al servicio y el resto al front. Por eso el código del front no cambia: llama a `/api` relativo,
igual que con el proxy de Vite en local.

## La trampa que NO se puede olvidar

`pdftotext` es dependencia del **sistema operativo**, y `npm ci` **no** la instala. Por eso la API va en un
**Dockerfile** que hace `apt-get install -y poppler-utils`. Sin ella, generar etiquetas responde 503.
(En App Platform no se puede instalar un paquete de sistema con buildpacks; de ahí el Dockerfile.)

## Requisitos previos

- Cuenta de DigitalOcean (ya existe).
- El repo en GitHub (`PabloS-coolway/automatizaciones`), rama `main`.
- **Opcional pero recomendado**: `doctl` (CLI de DO). Sin él, todo se puede hacer desde el panel web.
  ```bash
  # Linux (binario oficial, sin sudo si ~/bin está en el PATH):
  cd /tmp && curl -sL https://github.com/digitalocean/doctl/releases/latest/download/doctl-*-linux-amd64.tar.gz | tar xz
  mv doctl ~/.local/bin/ && doctl auth init   # pega un token de https://cloud.digitalocean.com/account/api/tokens
  ```

## Paso a paso

### 1. Generar el secreto de sesión
```bash
openssl rand -base64 32
```
Guárdalo: es el `JWT_SECRET`. **Sin él la API no arranca** (a propósito: con el de desarrollo, los tokens
serían falsificables).

### 2. Crear la app
**Con doctl:**
```bash
doctl apps create --spec .do/app.yaml
```
**O desde el panel:** Apps → Create App → **Import an App Spec** → subir `.do/app.yaml`.

App Platform detecta los tres componentes (web, api, db) y pide autorizar el acceso al repo de GitHub.

### 3. Poner el secreto
En el panel: App → **Settings** → componente **api** → **Environment Variables** → `JWT_SECRET` →
pegar el valor del paso 1 → **Encrypt** (para que quede como secreto) → Save. Redespliega solo.

> `DATABASE_URL` **no se toca**: la Managed Postgres la inyecta sola (con SSL).

### 4. Migraciones
Se aplican **solas** en cada arranque del contenedor (`prisma migrate deploy`, que es idempotente). No hay
que hacer nada. *(Si algún día se escala a más de una instancia, mover la migración a un job `PRE_DEPLOY`
en el app spec para que no corran en paralelo.)*

### 5. Crear el primer administrador
No hay registro abierto: el primer admin se crea por CLI, una vez. En el panel: App → componente **api** →
pestaña **Console**:
```bash
npm run auth:create-user -- --email tu@email.com --password "…" --name "Tu nombre" --role admin
```

### 6. Cargar el maestro
Entra a la web (la URL `…ondigitalocean.app` que da la app), inicia sesión y ve a **Base de datos →
Cargas** → sube `REFERENCIAS COOLWAY.xlsx`. **Revisa los avisos** del log del servicio (App → api → Runtime
Logs): cabeceras duplicadas, hoja `ROPA` mal rotulada, EAN13 compartidos.

### 7. Comprobar que vive
```bash
curl https://<tu-app>.ondigitalocean.app/api/health   # -> {"status":"ok"}
```
Y genera un pedido de prueba desde la web (p.ej. `4603418.pdf`, destino USA) para confirmar que `pdftotext`
está y las etiquetas salen.

## Actualizaciones

`deploy_on_push: true` está activo: cada push a `main` redespliega solo. Para cambiar la configuración
(recursos, variables), editar `.do/app.yaml` y `doctl apps update <APP_ID> --spec .do/app.yaml`.

## Qué NO cubre esto todavía (deuda)

- **Dominio propio**: hoy usa el subdominio `.ondigitalocean.app`. Añadir uno propio es una sección
  *Domains* en el panel; no requiere cambios de código.
- **La imagen corre con ts-node** (compila TS al arrancar). Funciona; para arranque más rápido e imagen
  más ligera, compilar a JS (tsc + tsc-alias) más adelante.
- **Sin CI**: los tests se corren en local antes de pushear (la puerta de calidad del skill `/pr-coolway`).
  Un workflow de GitHub Actions que corra `npm test` en cada PR sería el siguiente paso.
