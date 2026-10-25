import assert from 'node:assert/strict'
import { test } from 'node:test'
import { connectInMemory, expectTools, textOf } from '@aimuzov/infra-mcp-kit/testing'

import { createServer, loadContext } from './server.ts'

test('сервер отдаёт ровно свои инструменты', async () => {
	const client = await connectInMemory(createServer({ apiToken: 't' }))

	await expectTools(client, ['echo'])
	await client.close()
})

test('echo возвращает сообщение', async () => {
	const client = await connectInMemory(createServer({ apiToken: 't' }))
	const result = await client.callTool({ name: 'echo', arguments: { message: 'привет' } })

	assert.equal(textOf(result), 'привет')
	await client.close()
})

test('без токена инструмент отвечает ошибкой, а не роняет сервер', async () => {
	const client = await connectInMemory(createServer(loadContext({})))
	const result = await client.callTool({ name: 'echo', arguments: { message: 'привет' } })

	assert.equal(result.isError, true)
	assert.match(textOf(result), /API_TOKEN/)
	await client.close()
})
