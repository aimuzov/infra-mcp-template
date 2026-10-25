/**
 * Контракт протокола глазами клиента: список инструментов со схемами и формы ответов.
 * Тест не знает, на каком SDK собран сервер, и должен пережить его смену без правок.
 * Фикстура переснимается так: `UPDATE_CONTRACT=1 node --test src/contract.test.ts`.
 */
import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { test } from 'node:test'
import { readVersion } from '@aimuzov/infra-mcp-kit'
import { connectInMemory } from '@aimuzov/infra-mcp-kit/testing'

import { createServer, type Context } from './server.ts'

const FIXTURE = new URL('./contract.tools.json', import.meta.url)

/** Ответ после JSON: поля со значением undefined по проводу не доезжают. */
const wire = (value: unknown): unknown => JSON.parse(JSON.stringify(value))

/**
 * Инструмент так, как его видит клиент по проводу, без полей, которые SDK добавляет от себя.
 * `$schema` (диалект JSON Schema) и `execution` (задачи MCP) выбирает библиотека,
 * а не сервер, поэтому в контракт они не входят.
 */
function contractOf({ name, title, description, inputSchema }: Record<string, unknown>) {
	const { $schema: _dialect, ...schema } = inputSchema as Record<string, unknown>

	return wire({ name, title, description, inputSchema: schema })
}

const connect = (context: Context = { apiToken: 't', via: 'stdio' }) => connectInMemory(createServer(context))

test('tools/list совпадает с фикстурой: имена, описания и inputSchema', async () => {
	const tools = (await (await connect()).listTools()).tools.map(contractOf)

	if (process.env.UPDATE_CONTRACT) await writeFile(FIXTURE, `${JSON.stringify(tools, null, '\t')}\n`)

	assert.deepEqual(tools, JSON.parse(await readFile(FIXTURE, 'utf8')))
})

test('initialize называет сервер и объявляет инструменты', async () => {
	const client = await connect()

	assert.deepEqual(client.getServerVersion(), { name: '__NAME__', version: readVersion(import.meta.url) })
	assert.ok(client.getServerCapabilities()?.tools)
})

test('успех: один текстовый блок без isError', async () => {
	const result = await (await connect()).callTool({ name: 'echo', arguments: { message: 'привет' } })

	assert.deepEqual(wire(result), { content: [{ type: 'text', text: 'привет' }] })
})

test('ошибка инструмента: результат с isError и текстом, а не JSON-RPC ошибка', async () => {
	const result = await (
		await connect({ apiToken: '', via: 'stdio' })
	).callTool({
		name: 'echo',
		arguments: { message: 'привет' },
	})

	assert.deepEqual(wire(result), {
		content: [{ type: 'text', text: 'API_TOKEN is not set. Add it to the env of this server in your MCP config' }],
		isError: true,
	})
})

for (const [title, args] of [
	['пустая строка', { message: '' }],
	['нет аргумента', {}],
	['не тот тип', { message: 42 }],
] as const) {
	test(`ошибка валидации аргументов (${title}): isError с именем поля`, async () => {
		const result = await (await connect()).callTool({ name: 'echo', arguments: args })

		assert.equal(result.isError, true)

		const blocks = result.content as { type: string; text: string }[]

		assert.equal(blocks.length, 1)
		assert.equal(blocks[0]?.type, 'text')
		assert.match(blocks[0]?.text ?? '', /message/)
	})
}
