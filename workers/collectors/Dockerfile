# Collector de la SEC: corre en modo --watch (ciclo cada 15 min) dentro del contenedor.
FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production TZ=America/Santiago

COPY package.json package-lock.json ./
# Se instalan también las devDependencies: el collector corre con tsx (TypeScript directo).
RUN npm ci --include=dev --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src

USER node
CMD ["npx", "tsx", "src/index.ts", "--watch"]
