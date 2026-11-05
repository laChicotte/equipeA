# API Lirel (NestJS + Prisma)
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
ENV NODE_ENV=production PORT=4000
EXPOSE 4000
# Applique les migrations en attente puis démarre l'API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
