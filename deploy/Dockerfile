# Удалённый коннектор: `__NAME__ serve --http`. Контекст сборки -- корень репозитория.

FROM node:26.11.1-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json tsconfig.build.json astro.config.mjs svelte.config.js postcss.config.mjs ./
COPY src ./src
# `build` собирает и сервер, и страницы Astro в build/public; Astro и Svelte остаются
# devDependencies и уходят вместе с prune.
RUN npm run build && npm prune --omit=dev

FROM node:26.11.1-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
# Клиенты и коды OAuth лежат в томе. Каталог создаётся здесь, чтобы пустой том
# унаследовал владельца node и сервер мог в него писать.
RUN mkdir /data && chown node:node /data
ENV XDG_CONFIG_HOME=/data PORT=8080
USER node
EXPOSE 8080
CMD ["node", "build/index.js", "serve", "--http"]
