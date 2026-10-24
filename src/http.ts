import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { dataDir, type Env } from '@aimuzov/infra-mcp-kit'
import {
	loadHttpConfig,
	serveHttp,
	sqliteStore,
	tokenFormLogin,
	type AuthStore,
	type HttpAppOptions,
	type HttpConfig,
	type Service,
} from '@aimuzov/infra-mcp-kit/http'

import { createServer, NAME } from './server.ts'

export const service: Service = { name: NAME, repo: `https://github.com/aimuzov/${NAME}` }

/**
 * Вход вставкой API-токена сервиса. Токен едет в claims, поэтому токены доступа шифруются:
 * иначе он читался бы из них открытым текстом.
 */
const login = tokenFormLogin({
	title: `Подключение ${NAME}`,
	lead: 'Токен останется только внутри зашифрованного токена доступа, сервер его не хранит.',
	fields: [{ name: 'token', label: 'API-токен', type: 'password' }],
	verify: ({ token = '' }) => ({
		// TODO: проверь токен запросом к API сервиса, `LoginError` вернёт человека на форму,
		// а в `subject` положи id пользователя оттуда. Пока это отпечаток самого токена.
		subject: createHash('sha256').update(token).digest('hex').slice(0, 16),
		claims: { apiToken: token },
	}),
})

export function httpOptions(config: HttpConfig, store: AuthStore): HttpAppOptions {
	return {
		config,
		service,
		auth: { login, store, tokens: 'encrypt' },
		createServer: (auth) => createServer({ apiToken: String(auth?.extra?.apiToken ?? '') }),
		landing: { tagline: '__DESCRIPTION__', tools: ['echo'] },
	}
}

/** `serve --http`: клиенты и коды OAuth живут в SQLite в каталоге данных. */
export async function serve(env: Env = process.env): Promise<void> {
	await serveHttp(httpOptions(loadHttpConfig(env), sqliteStore(join(dataDir(NAME, env), 'auth.db'))))
}
