# Imagen de la API de etiquetas (NestJS) para DigitalOcean App Platform.
#
# Se construye desde la RAÍZ del monorepo (el contexto es el repo entero), porque la API depende
# del workspace `@yorga/contracts`. En App Platform: source_dir "/" y dockerfile_path apuntando aquí.
#
# ⚠️ La razón de ser de este Dockerfile: `pdftotext` es dependencia del SISTEMA OPERATIVO y `npm ci`
# NO la instala. Sin ella, generar etiquetas responde 503. La imagen la trae con `poppler-utils`.
#
# Arranca con ts-node (el mismo comando que en local). No se compila a JS a propósito: la resolución
# de los alias `@yorga/contracts` en el JS compilado añade fricción, y ts-node es lo que ya funciona.
# Optimización futura: compilar con tsc + tsc-alias para una imagen más ligera y arranque más rápido.
FROM node:22-bookworm-slim

# Dependencias de SISTEMA:
#   · poppler-utils → `pdftotext` (leer el PDF del pedido; npm ci no lo instala).
#   · openssl       → lo necesita el motor de Prisma; sin él, `migrate deploy` falla al arrancar.
RUN apt-get update \
  && apt-get install -y --no-install-recommends poppler-utils openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Se copia todo el monorepo: `npm ci` en la raíz necesita el package.json de todos los workspaces.
COPY . .

# Instala dependencias (incluidas las de desarrollo: ts-node y el CLI de prisma hacen falta en runtime).
RUN npm ci

# Genera el cliente Prisma (contra el schema versionado).
RUN npm run db:generate

ENV NODE_ENV=production
# App Platform inyecta el puerto en $PORT; la API ya lee process.env.PORT (por defecto 3000).
EXPOSE 3000

# `migrate deploy` es idempotente: seguro en cada arranque (1 instancia). Si se escala a >1,
# mover la migración a un job PRE_DEPLOY en el app spec.
CMD ["sh", "-c", "npm run db:migrate && npm run serve -w @yorga/etiquetas-coolway-api"]
