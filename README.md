# infra-mcp-template

[Русский](README.ru.md)

Template for the aimuzov MCP servers on [infra-mcp-kit](https://github.com/aimuzov/infra-mcp-kit). A server from it
runs locally over stdio and as a hosted connector with OAuth, ships to npm and deploys to the projects server.

## New server

```bash
gh repo create aimuzov/example-mcp --public --template aimuzov/infra-mcp-template --clone
cd example-mcp
grep -rl --exclude-dir=node_modules --exclude-dir=.git -e __NAME__ -e __DOMAIN__ -e __DESCRIPTION__ . |
	xargs sed -i '' -e 's/__NAME__/example-mcp/g' -e 's/__DOMAIN__/example-mcp.aimuzov.online/g' \
		-e 's/__DESCRIPTION__/What the server does, in one line/g'
npm install
```

Then:

- Replace the `echo` tool in `src/server.ts` with the real ones and update the list in `src/server.test.ts`.
- Make `verify` in `src/http.ts` check the token against the API of the service and return the user id.
- Allow GitHub Actions to create and approve pull requests in the repository settings: release-please needs it.

## Placeholders

- `__NAME__`: repository, npm package `@aimuzov/__NAME__`, binary and container name.
- `__DOMAIN__`: address of the hosted connector.
- `__DESCRIPTION__`: one line for `package.json` and the landing page.

## Release

A merge into `main` updates the release PR of release-please, merging that PR cuts the release. Two repository
variables turn on the rest:

- `NPM_PUBLISH=true` publishes the release to npm, with the `NPM_TOKEN` secret or npm trusted publishing.
- `DEPLOY_ENABLED=true` deploys it to the projects server. It needs the `DEPLOY_SSH_KEY` secret, a clone in `/srv`
  with `.env` from `.env.example` and a site in Caddy of [infra-server](https://github.com/aimuzov/infra-server). A
  server that only runs over stdio leaves it off.
