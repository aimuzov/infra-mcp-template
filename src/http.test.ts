import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createHttpApp, memoryStore } from '@aimuzov/infra-mcp-kit/http'
import { connectHttp, hiddenField, oauthFlow, startHttp, textOf } from '@aimuzov/infra-mcp-kit/testing'

import { httpOptions } from './http.ts'

const http = await startHttp(
	(base) =>
		createHttpApp(
			httpOptions(
				{ port: 0, publicUrl: new URL(base), authSecret: 'x'.repeat(32), allowedRedirectUris: [] },
				memoryStore(),
			),
		).app,
)

after(() => http.close())

/** Что делает человек на странице входа: вставляет токен и отправляет форму. */
const submit = (token: string) => (page: string, callback: URL) =>
	fetch(callback, {
		method: 'POST',
		redirect: 'manual',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({ request: hiddenField(page, 'request'), token }),
	})

test('токен из формы входа доезжает до инструмента, код одноразовый', async () => {
	const flow = await oauthFlow({ base: http.base, login: submit('secret') })
	const client = await connectHttp(http.base, flow.tokens.access_token)
	const result = await client.callTool({ name: 'echo', arguments: { message: 'привет' } })

	assert.equal(textOf(result), 'привет')
	await client.close()

	const again = await flow.exchangeAgain()

	assert.equal(again.status, 400)
	assert.equal(((await again.json()) as { error: string }).error, 'invalid_grant')
})

test('/mcp без токена закрыт', async () => {
	const res = await fetch(`${http.base}/mcp`, { method: 'POST', body: '{}' })

	assert.equal(res.status, 401)
})

test('лендинг и /health отвечают', async () => {
	assert.equal((await fetch(`${http.base}/`)).status, 200)
	assert.deepEqual(await (await fetch(`${http.base}/health`)).json(), { ok: true })
})
