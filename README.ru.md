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
- В `verify` из `src/http.ts` проверять токен запросом к API сервиса и возвращать id пользователя.
- В настройках репозитория разрешить GitHub Actions создавать и одобрять PR, без этого не работает release-please.

## Плейсхолдеры

- `__NAME__` -- репозиторий, npm-пакет `@aimuzov/__NAME__`, бинарь и имя контейнера.
- `__DOMAIN__` -- адрес удалённого коннектора.
- `__DESCRIPTION__` -- строка для `package.json` и лендинга.

## Релиз

Мёрж в `main` обновляет релизный PR release-please, мёрж этого PR выпускает релиз. Остальное включают две переменные
репозитория:

- `NPM_PUBLISH=true` публикует релиз в npm, с секретом `NPM_TOKEN` или через trusted publishing.
- `DEPLOY_ENABLED=true` деплоит его на сервер проектов. Нужны секрет `DEPLOY_SSH_KEY`, клон в `/srv` с `.env` по
  образцу `.env.example` и сайт в Caddy из [infra-server](https://github.com/aimuzov/infra-server). Серверу только
  для stdio она не нужна.
