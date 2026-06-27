FROM node:23-alpine AS deps

WORKDIR /app
COPY apps/smpp/package.docker.json ./package.json
RUN npm install --production

FROM node:23-alpine AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
RUN npm install esbuild
COPY apps/smpp/src ./src
RUN npx esbuild src/index.ts --bundle --platform=node --outfile=dist/index.cjs --format=cjs --packages=external

FROM node:23-alpine

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=build /app/dist ./dist

RUN addgroup -S app && adduser -S app -G app
USER app

ENV HTTP_PORT=9511
EXPOSE 9511

CMD ["node", "dist/index.cjs"]
