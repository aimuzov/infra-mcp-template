#!/usr/bin/env node
import { readVersion, runCli } from '@aimuzov/infra-mcp-kit'

import { createServer, loadContext, NAME } from './server.ts'

const USAGE = `Usage: ${NAME} [serve [--http] | --help | --version]

  serve          MCP server on stdio, the default
  serve --http   hosted connector with OAuth on PORT

Environment:
  API_TOKEN               token of the service for stdio
  PUBLIC_URL              public address of the connector, for --http
  AUTH_SECRET             key of the access tokens, 32 characters or more, for --http
  PORT                    default 8080
  ALLOWED_REDIRECT_URIS   OAuth callbacks allowed besides Claude and loopback, comma-separated
  XDG_CONFIG_HOME         data directory, default ~/.config
  SENTRY_DSN              report errors to Sentry, off when empty`

await runCli({
	name: NAME,
	version: readVersion(import.meta.url),
	usage: USAGE,
	stdio: () => createServer(loadContext()),
	// Express и OAuth грузятся только для коннектора, stdio-процесс стартует без них.
	http: async () => (await import('./http.ts')).serve(),
})
