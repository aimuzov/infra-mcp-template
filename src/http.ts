import { join } from 'node:path'
import { dataDir, type Env } from '@aimuzov/infra-mcp-kit'
import {
	loadHttpConfig,
	LoginError,
	serveHttp,
	sqliteStore,
	tokenFormLogin,
	type AuthStore,
	type HttpAppOptions,
	type HttpConfig,
	type Service,
	type TokenFormLoginOptions,
} from '@aimuzov/infra-mcp-kit/http'

import { createServer, NAME } from './server.ts'

export const service: Service = { name: NAME, repo: `https://github.com/aimuzov/${NAME}` }

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

export function httpOptions(config: HttpConfig, store: AuthStore, verify: Verify = verifyToken): HttpAppOptions {
	// Токен едет в claims, поэтому токены доступа шифруются: иначе он читался бы
	// из них открытым текстом.
	const login = tokenFormLogin({
		title: `Подключение ${NAME}`,
		lead: 'Токен останется только внутри зашифрованного токена доступа, сервер его не хранит.',
		fields: [{ name: 'token', label: 'API-токен', type: 'password' }],
		verify,
	})

	return {
		config,
		service,
		auth: { login, store, tokens: 'encrypt' },
		createServer: (auth) => createServer({ apiToken: String(auth?.extra?.apiToken ?? ''), via: 'http' }),
		landing: { tagline: '__DESCRIPTION__', tools: ['echo'] },
	}
}

/** `serve --http`: клиенты и коды OAuth живут в SQLite в каталоге данных. */
export async function serve(env: Env = process.env): Promise<void> {
	await serveHttp(httpOptions(loadHttpConfig(env), sqliteStore(join(dataDir(NAME, env), 'auth.db'))))
}
