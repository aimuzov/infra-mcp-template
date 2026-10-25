import type { Server } from 'node:http'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dataDir, readVersion, type Env } from '@aimuzov/infra-mcp-kit'
import {
	loadHttpConfig,
	LoginError,
	sendJson,
	serveHttp,
	sqliteStore,
	tokenFormLogin,
	type AuthStore,
	type HttpAppOptions,
	type HttpConfig,
	type TokenFormLoginOptions,
} from '@aimuzov/infra-mcp-kit/http'

import { createServer, NAME } from './server.ts'

/**
 * Страницы, которые собрал `astro build`. Путь один и из `src`, и из `build`:
 * `src/http.ts` и `build/http.js` лежат на одной глубине.
 */
export const PUBLIC_DIR = fileURLToPath(new URL('../build/public', import.meta.url))

const version = readVersion(import.meta.url)

export type Verify = TokenFormLoginOptions['verify']

/**
 * Проверка токена с формы входа.
 *
 * TODO: проверь токен запросом к API сервиса, `LoginError` вернёт человека на форму.
 * Верни `{ subject: <id пользователя из API>, claims: { apiToken: token } }`.
 * Пока проверки нет, вход закрыт: иначе коннектор пустил бы с любым токеном.
 */
export const verifyToken: Verify = () => {
	throw new LoginError('Проверка токена не реализована, см. TODO в src/http.ts')
}

export type HttpParts = {
	config: HttpConfig
	store: AuthStore
	verify?: Verify
	publicDir?: string
}

export function httpOptions({
	config,
	store,
	verify = verifyToken,
	publicDir = PUBLIC_DIR,
}: HttpParts): HttpAppOptions {
	// Тексты формы живут в `mcpPages` в astro.config.mjs, здесь только имена полей.
	// Токен едет в claims, поэтому токены доступа шифруются: иначе он читался бы
	// из них открытым текстом.
	const login = tokenFormLogin({ fields: [{ name: 'token', label: 'API-токен' }], verify })

	return {
		config,
		service: { name: NAME },
		publicDir,
		auth: { login, store, tokens: 'encrypt' },
		createServer: (auth) => createServer({ apiToken: String(auth?.extra?.apiToken ?? ''), via: 'http' }),
		// Пример своего JSON-маршрута: его читает остров на странице `/status`.
		routes(request) {
			const { pathname } = new URL(request.url)

			if (request.method === 'GET' && pathname === '/api/status') return sendJson({ name: NAME, version })
		},
	}
}

/**
 * `serve --http`: клиенты и коды OAuth живут в SQLite в каталоге данных.
 * Проверку токена и страницы можно подменить, а сервер возвращается: это для тестов.
 */
export async function serve(
	env: Env = process.env,
	parts: Pick<HttpParts, 'verify' | 'publicDir'> = {},
): Promise<Server> {
	return serveHttp(
		httpOptions({ config: loadHttpConfig(env), store: sqliteStore(join(dataDir(NAME, env), 'auth.db')), ...parts }),
	)
}
