# infra-mcp-template

[English](README.md)

Шаблон MCP-серверов aimuzov на [infra-mcp-kit](https://github.com/aimuzov/infra-mcp-kit). Сервер из него работает
локально по stdio и удалённым коннектором с OAuth, выходит в npm и деплоится на сервер проектов.

## Новый сервер

```bash
gh repo create aimuzov/example-mcp --public --template aimuzov/infra-mcp-template --clone
cd example-mcp
grep -rl --exclude-dir=node_modules --exclude-dir=.git -e __NAME__ -e __DOMAIN__ -e __DESCRIPTION__ . |
	xargs sed -i '' -e 's/__NAME__/example-mcp/g' -e 's/__DOMAIN__/example-mcp.aimuzov.online/g' \
		-e 's/__DESCRIPTION__/Что делает сервер, одной строкой/g'
npm install
```

Дальше:

- Заменить инструмент `echo` в `src/server.ts` на настоящие и поправить список в `src/server.test.ts`.
- В `verifyToken` из `src/http.ts` проверять токен запросом к API сервиса и возвращать id пользователя.
- Вписать инструменты и тексты лендинга и формы входа в `mcpPages` в `astro.config.mjs`. Поля формы там и в
  `tokenFormLogin` из `src/http.ts` сходятся по имени.
- Оставить или убрать пример `/status`: `src/frontend/pages/status.astro`, его остров и маршрут `/api/status`.
- Сбросить версию и историю релизов, иначе новый сервер унаследует их от шаблона:
  `echo '{}' > .release-please-manifest.json`, `npm pkg set version=0.0.0 && npm install` и пустой
  `CHANGELOG.md`. Первый релиз тогда возьмёт `initial-version` из `release-please-config.json`.
- В настройках репозитория разрешить GitHub Actions создавать и одобрять PR, без этого не работает release-please.

## Страницы

Лендинг, вход, ошибка и 404 приходят из `mcpPages()` кита, свои страницы сервера лежат в `src/frontend/pages` на
каркасе кита, как у сайтов. `npm run build` собирает сервер через `tsc` и страницы через `astro build` в
`build/public`, их и раздаёт коннектор. Astro и Svelte остаются dev-зависимостями и не попадают ни в `npx`, ни в
Docker-образ. `npm run dev:pages` поднимает одни страницы на dev-сервере Astro.

Серверу только для stdio не нужны `astro.config.mjs`, `svelte.config.js`, `postcss.config.mjs`, `src/frontend` и
`src/http.ts` вместе с их dev-зависимостями.

## Плейсхолдеры

- `__NAME__` -- репозиторий, npm-пакет `@aimuzov/__NAME__`, бинарь и имя контейнера.
- `__DOMAIN__` -- адрес удалённого коннектора.
- `__DESCRIPTION__` -- строка для `package.json` и лендинга в `astro.config.mjs`.

## Релиз

Мёрж в `main` обновляет релизный PR release-please, мёрж этого PR выпускает релиз. Остальное включают две переменные
репозитория:

- `NPM_PUBLISH=true` публикует релиз в npm, с секретом `NPM_TOKEN` или через trusted publishing.
- `DEPLOY_ENABLED=true` деплоит его на сервер проектов. Нужны секрет `DEPLOY_SSH_KEY`, клон в `/srv` с `.env` по
  образцу `.env.example` и сайт в Caddy из [infra-server](https://github.com/aimuzov/infra-server). Серверу только
  для stdio она не нужна.
