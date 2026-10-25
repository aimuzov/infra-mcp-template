import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createHttpApp, memoryStore, type HttpConfig } from '@aimuzov/infra-mcp-kit/http'
import { connectHttp, fakePages, oauthFlow, startHttp, submitForm, textOf } from '@aimuzov/infra-mcp-kit/testing'

import { httpOptions, type Verify } from './http.ts'

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
