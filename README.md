<p align="center">
	<img src="https://img.shields.io/badge/English-8b5cf6?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2MCAzMCI+PGNsaXBQYXRoIGlkPSJ0Ij48cGF0aCBkPSJNMzAsMTVoMzB2MTV6djE1aC0zMHpoLTMwdi0xNXp2LTE1aDMweiIvPjwvY2xpcFBhdGg+PHBhdGggZD0iTTAsMHYzMGg2MHYtMzB6IiBmaWxsPSIjMDEyMTY5Ii8+PHBhdGggZD0iTTAsMCA2MCwzME02MCwwIDAsMzAiIHN0cm9rZT0iI2ZmZiIgc3Ryb2tlLXdpZHRoPSI2Ii8+PHBhdGggZD0iTTAsMCA2MCwzME02MCwwIDAsMzAiIGNsaXAtcGF0aD0idXJsKCN0KSIgc3Ryb2tlPSIjQzgxMDJFIiBzdHJva2Utd2lkdGg9IjQiLz48cGF0aCBkPSJNMzAsMHYzME0wLDE1aDYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMTAiLz48cGF0aCBkPSJNMzAsMHYzME0wLDE1aDYwIiBzdHJva2U9IiNDODEwMkUiIHN0cm9rZS13aWR0aD0iNiIvPjwvc3ZnPg==" alt="English">
	<a href="README.ru.md"><img src="https://img.shields.io/badge/%D0%A0%D1%83%D1%81%D1%81%D0%BA%D0%B8%D0%B9-555?logo=data:image/svg%2bxml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5IDYiPjxwYXRoIGZpbGw9IiNmZmYiIGQ9Ik0wIDBoOXYzSDB6Ii8+PHBhdGggZmlsbD0iIzAwMzlhNiIgZD0iTTAgMmg5djJIMHoiLz48cGF0aCBmaWxsPSIjZDUyYjFlIiBkPSJNMCA0aDl2MkgweiIvPjwvc3ZnPg==" alt="Русский"></a>
</p>

<p align="center">
	<img src=".github/assets/banner.en.jpg" alt="infra-mcp-template: a new MCP server in minutes" width="100%">
</p>

<p align="center">
	<a href="https://github.com/aimuzov/infra-mcp-template/actions/workflows/check.yml"><img src="https://img.shields.io/github/actions/workflow/status/aimuzov/infra-mcp-template/check.yml?branch=main&label=check" alt="Check"></a>
	<a href="https://github.com/aimuzov/infra-mcp-template/releases"><img src="https://img.shields.io/github/v/release/aimuzov/infra-mcp-template?sort=semver&label=version" alt="Version"></a>
	<a href="package.json"><img src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Faimuzov%2Finfra-mcp-template%2Fmain%2Fpackage.json&query=%24.engines.node&label=node&logo=nodedotjs&logoColor=white&color=5fa04e" alt="Node"></a>
	<a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-template-8b5cf6" alt="MCP"></a>
	<a href="LICENSE"><img src="https://img.shields.io/github/license/aimuzov/infra-mcp-template" alt="License"></a>
</p>

<h3 align="center">A new MCP server from one template</h3>
<p align="center">stdio server, hosted OAuth connector with pages, checks, release and deploy</p>

Starting point of an aimuzov MCP server on [infra-mcp-kit](https://github.com/aimuzov/infra-mcp-kit): a stdio server with one example tool, a hosted connector with OAuth and pages in the "Signal" style, checks, release and deploy. The examples below create `example-mcp`.

## What's inside

- `src/server.ts`: the server and its tools. The `echo` example reads `API_TOKEN` in stdio and the token from the sign-in form in the connector.
- `src/http.ts`: the connector: `tokenFormLogin`, OAuth in `sqliteStore`, the `GET /api/status` route.
- `src/frontend`: the service's own pages on the kit layout. `status.astro` with a Svelte island shows the pattern.
- `astro.config.mjs`: `mcpPages()` with the landing, sign-in, error and 404 pages.
- `deploy/`: the image and the compose file for the projects server behind the shared Caddy.
- `.github/workflows`: `check` on every PR, `release` with npm publishing and deploy, `pr-meta`, Renovate.

## New server

1. Create the repository from the template and replace the placeholders. The READMEs stay out of the replacement: a new server writes its own.

    ```bash
    gh repo create aimuzov/example-mcp --public --template aimuzov/infra-mcp-template --clone
    cd example-mcp
    grep -rl --exclude-dir=node_modules --exclude-dir=.git --exclude='README*' \
    	-e __NAME__ -e __DOMAIN__ -e __DESCRIPTION__ . |
    	xargs perl -pi -e 's/__NAME__/example-mcp/g; s/__DOMAIN__/example-mcp.aimuzov.online/g; s/__DESCRIPTION__/What the server does, in one line/g'
    npm install
    ```

2. Reset the version and the changelog inherited from the template:

    ```bash
    echo '{}' > .release-please-manifest.json
    npm pkg set version=0.0.0
    : > CHANGELOG.md
    ```

3. Replace `echo` in `src/server.ts` with real tools and update the list in `src/server.test.ts`.
4. Implement `verifyToken` in `src/http.ts`: check the token with the service API and return `{ subject: <user id>, claims: { apiToken: token } }`. The claims reach `createServer` in `auth.extra`, so the tools get the token. Until then the connector refuses every sign-in.
5. Write the texts of the pages in `mcpPages` in `astro.config.mjs`: tagline, lead, tools, the sign-in form. Keep or drop `/status`.
6. In Settings → Actions → General turn on "Allow GitHub Actions to create and approve pull requests": release-please opens the release PR with it.

A stdio-only server drops the connector: `src/http.ts`, `src/http.test.ts`, `http` in `src/index.ts`, `astro.config.mjs`, `svelte.config.js`, `postcss.config.mjs`, `src/frontend`, `deploy/`, the Astro and site-kit dev dependencies and `docker` in `check.yml`.

## Run locally

```bash
npm start                                  # stdio, what a client starts
npm run build && node build/index.js serve --http
npm run dev:pages                          # the pages alone, with Astro HMR
```

`serve --http` reads the environment, see [`.env.example`](.env.example): `PUBLIC_URL=http://localhost:8080` and an `AUTH_SECRET` of 32 characters or more (`openssl rand -base64 48`) are enough locally. The data, `auth.db` included, goes to `<NAME>_DATA_DIR`, `$XDG_CONFIG_HOME/<name>` or `~/.config/<name>`. `LOG_LEVEL=debug` prints stacks.

## Placeholders

- `__NAME__`: the repository, the npm package `@aimuzov/__NAME__`, the binary, the container and its volume, the title of `/status`.
- `__DOMAIN__`: the address of the hosted connector, in `.env.example` and in the deploy of `release.yml`.
- `__DESCRIPTION__`: one line for `package.json` and the landing page.

## Release and deploy

A merge into `main` only updates the release PR of release-please. Merging that PR cuts a release, the checks run again, and then:

- with the repository variable `NPM_PUBLISH=true` and the secret `NPM_TOKEN` the release goes to npm;
- with `DEPLOY_ENABLED=true` and the secret `DEPLOY_SSH_KEY` it goes to the projects server.

A manual run of `release` publishes the tag given in `tag`; deploy takes the tag too, or the newest `main` when it is empty.

The projects server needs the steps of _Adding a project_ in [infra-server](https://github.com/aimuzov/infra-server#adding-a-project) once: a deploy key, the clone in `/srv/example-mcp`, its `.env` from `.env.example`, `sites/example-mcp.caddy` with `reverse_proxy example-mcp:8080` and the domain pointed at the server. The container listens on 8080, keeps its data in the `example-mcp-data` volume and joins the `edge` network of Caddy without published ports.
