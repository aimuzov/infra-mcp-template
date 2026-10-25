import assert from 'node:assert/strict'
import { access, mkdtemp } from 'node:fs/promises'
import type { Server } from 'node:http'
import { createServer as createNetServer, type AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'
import { createHttpApp, LoginError, memoryStore, type HttpConfig } from '@aimuzov/infra-mcp-kit/http'
import { connectHttp, fakePages, oauthFlow, startHttp, submitForm, textOf } from '@aimuzov/infra-mcp-kit/testing'

import { httpOptions, serve, verifyToken, type Verify } from './http.ts'

const config = (base: string): HttpConfig => ({
	port: 0,
	publicUrl: new URL(base),
	authSecret: 'x'.repeat(32),
	allowedRedirectUris: [],
})

// Заглушка вместо проверки токена в API сервиса, которой в шаблоне нет.
const acceptAny: Verify = ({ token = '' }) => ({ subject: 'user-1', claims: { apiToken: token } })

// Заглушки вместо сборки Astro: тестам важно только, что сервер их отдаёт.
const publicDir = fakePages()

const app = (verify?: Verify) => (base: string) =>
	createHttpApp(httpOptions({ config: config(base), store: memoryStore(), verify, publicDir })).app

const http = await startHttp(app(acceptAny))
const untouched = await startHttp(app())

after(() => Promise.all([http.close(), untouched.close()]))

test('токен из формы входа доезжает до инструмента, код одноразовый', async () => {
	const flow = await oauthFlow({ base: http.base, login: submitForm({ token: 'secret' }) })
	const client = await connectHttp(http.base, flow.tokens.access_token)
	const result = await client.callTool({ name: 'echo', arguments: { message: 'привет' } })

	assert.equal(textOf(result), 'привет')
	await client.close()

	const again = await flow.exchangeAgain()

	assert.equal(again.status, 400)
	assert.equal(((await again.json()) as { error: string }).error, 'invalid_grant')
})

test('без своей проверки токена шаблон никого не пускает', async () => {
	await assert.rejects(
		oauthFlow({ base: untouched.base, login: submitForm({ token: 'secret' }) }),
		/Проверка токена не реализована/,
	)
})

test('/mcp без токена закрыт', async () => {
	const res = await fetch(`${http.base}/mcp`, { method: 'POST', body: '{}' })

	assert.equal(res.status, 401)
})

test('лендинг и /health отвечают', async () => {
	assert.match(await (await fetch(`${http.base}/`)).text(), /page:index/)
	assert.deepEqual(await (await fetch(`${http.base}/health`)).json(), { ok: true })
})

test('/api/status отдаёт имя и версию для острова', async () => {
	const res = await fetch(`${http.base}/api/status`)
	const body = (await res.json()) as { name: string; version: string }

	assert.equal(res.headers.get('cache-control'), 'no-store')
	assert.equal(body.name, '__NAME__')
	assert.match(body.version, /^\d+\.\d+\.\d+/)
})

test('заглушка verifyToken отклоняет любой вход ошибкой входа', async () => {
	for (const values of [{ token: 'secret' }, { token: '' }, {}] as Record<string, string>[]) {
		await assert.rejects(
			async () => verifyToken(values),
			(error: unknown) => {
				assert.ok(error instanceof LoginError)
				assert.match(error.message, /Проверка токена не реализована/)

				return true
			},
		)
	}
})

test('/api/status без токена доступен, а неизвестный API-адрес отвечает JSON 404', async () => {
	const status = await fetch(`${untouched.base}/api/status`)

	assert.equal(status.status, 200)
	assert.match(status.headers.get('content-type') ?? '', /application\/json/)

	const missing = await fetch(`${http.base}/api/nope`, { headers: { accept: 'application/json' } })

	assert.equal(missing.status, 404)
	assert.match(missing.headers.get('content-type') ?? '', /application\/json/)
})

/** Свободный порт: `serve` слушает `PORT` из окружения, а публичный адрес должен его знать заранее. */
async function freePort(): Promise<number> {
	const probe = createNetServer()

	await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))

	const { port } = probe.address() as AddressInfo

	await new Promise((resolve) => probe.close(resolve))

	return port
}

async function serveEnv() {
	const port = await freePort()
	const dataHome = await mkdtemp(join(tmpdir(), 'mcp-data-'))

	return {
		base: `http://127.0.0.1:${port}`,
		dataHome,
		env: {
			PORT: String(port),
			PUBLIC_URL: `http://127.0.0.1:${port}`,
			AUTH_SECRET: 'y'.repeat(32),
			XDG_CONFIG_HOME: dataHome,
		},
	}
}

const close = (server: Server) =>
	new Promise<void>((resolve) => {
		server.closeAllConnections()
		server.close(() => resolve())
	})

test('serve --http: OAuth через SQLite в каталоге данных, токен доезжает до инструмента', async () => {
	const { base, env, dataHome } = await serveEnv()
	const server = await serve(env, { verify: acceptAny, publicDir })

	try {
		assert.match(await (await fetch(`${base}/`)).text(), /page:index/)

		const flow = await oauthFlow({ base, login: submitForm({ token: 'secret' }) })
		const client = await connectHttp(base, flow.tokens.access_token)

		assert.equal(textOf(await client.callTool({ name: 'echo', arguments: { message: 'привет' } })), 'привет')
		await client.close()

		// Клиенты и коды OAuth лежат в SQLite, а не в памяти: переживают перезапуск.
		await access(join(dataHome, '__NAME__', 'auth.db'))

		const refreshed = await flow.refresh()

		assert.equal(refreshed.status, 200)
	} finally {
		await close(server)
	}
})

test('serve --http без своей проверки токена закрыт для входа', async () => {
	const { base, env } = await serveEnv()
	const server = await serve(env, { publicDir })

	try {
		await assert.rejects(
			oauthFlow({ base, login: submitForm({ token: 'secret' }) }),
			/Проверка токена не реализована/,
		)
	} finally {
		await close(server)
	}
})

test('serve --http без AUTH_SECRET не стартует', async () => {
	const { env } = await serveEnv()

	await assert.rejects(serve({ ...env, AUTH_SECRET: '' }, { publicDir }), /AUTH_SECRET/)
	await assert.rejects(serve({ ...env, AUTH_SECRET: 'short' }, { publicDir }), /AUTH_SECRET/)
})
