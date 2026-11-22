# picky-server API image for local Docker runs (the deployed API runs on Vercel).
FROM node:24.14.1-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
COPY scripts ./scripts
COPY docs/openapi ./docs/openapi
RUN npm run build && npm prune --omit=dev

FROM node:24.14.1-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY migrations ./migrations
COPY docs/openapi ./docs/openapi
USER node
EXPOSE 3000
CMD ["node", "dist/src/main.js"]
