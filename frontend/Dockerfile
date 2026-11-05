# Front MonMentor (Next.js)
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Adresse publique de l'API, intégrée au build.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_TURN_URL=""
ARG NEXT_PUBLIC_TURN_USERNAME=""
ARG NEXT_PUBLIC_TURN_CREDENTIAL=""
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_TURN_URL=$NEXT_PUBLIC_TURN_URL \
    NEXT_PUBLIC_TURN_USERNAME=$NEXT_PUBLIC_TURN_USERNAME \
    NEXT_PUBLIC_TURN_CREDENTIAL=$NEXT_PUBLIC_TURN_CREDENTIAL
RUN npm run build

FROM node:24-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/next.config.ts ./
EXPOSE 3000
CMD ["npm", "start"]
