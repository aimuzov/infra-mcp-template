import assert from 'node:assert/strict'
import { execFile, spawn } from 'node:child_process'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import { mkdtemp } from 'node:fs/promises'
import { createServer as createNetServer, type AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { oauthFlow, submitForm } from '@aimuzov/infra-mcp-kit/testing'

const CLI = fileURLToPath(new URL('./index.ts', import.meta.url))
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }

// Окружение разработчика в дочерний процесс не попадает: только то, что задал тест.
const baseEnv = { PATH: process.env.PATH }

/** Запустить CLI и дождаться выхода. Код выхода возвращается, а не бросается. */
async function run(args: string[], env: Record<string, string | undefined> = {}) {
	try {
		const { stdout, stderr } = await promisify(execFile)(process.execPath, [CLI, ...args], {
			env: { ...baseEnv, ...env },
		})

		return { code: 0, stdout, stderr }
	} catch (error) {
		const { code, stdout, stderr } = error as { code: number; stdout: string; stderr: string }

		return { code, stdout, stderr }
	}
}

test('--help печатает команды и переменные окружения', async () => {
	const { code, stdout } = await run(['--help'])

	assert.equal(code, 0)
	assert.match(stdout, /^Usage: __NAME__ \[serve \[--http\] \| --help \| --version\]/)
	assert.match(stdout, /^ {2}serve --http +hosted connector with OAuth on PORT$/m)

	for (const name of ['API_TOKEN', 'PUBLIC_URL', 'AUTH_SECRET', 'PORT', 'ALLOWED_REDIRECT_URIS', 'XDG_CONFIG_HOME']) {
		assert.match(stdout, new RegExp(`^ {2}${name} `, 'm'))
	}

	assert.equal((await run(['-h'])).stdout, stdout)
})

test('--version печатает версию из package.json', async () => {
	assert.deepEqual(await run(['--version']), { code: 0, stdout: `${version}\n`, stderr: '' })
})

test('неизвестная команда даёт код 2 и справку', async () => {
	const { code, stderr } = await run(['nope'])

	assert.equal(code, 2)
	assert.match(stderr, /nope/)
	assert.match(stderr, /Usage: __NAME__/)
})

test('serve --http без конфига падает одной строкой с кодом 1', async () => {
	const { code, stderr } = await run(['serve', '--http'])

	assert.equal(code, 1)
	assert.match(stderr, /^__NAME__: .*AUTH_SECRET/)
})

test('stdio без API_TOKEN стартует и отвечает инструментом с ошибкой', async () => {
	const child = spawn(process.execPath, [CLI], { env: baseEnv, stdio: ['pipe', 'pipe', 'inherit'] })
	const lines = createInterface({ input: child.stdout })[Symbol.asyncIterator]()

	/** JSON-RPC построчно, как его шлёт любой MCP-клиент: без SDK на этой стороне. */
	async function request(id: number, method: string, params: object) {
		child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)

		const { value } = await lines.next()

		return JSON.parse(String(value)) as { id: number; result: Record<string, unknown> }
	}

	try {
		const init = await request(1, 'initialize', {
			protocolVersion: '2025-06-18',
			capabilities: {},
			clientInfo: { name: 'test', version: '0.0.0' },
		})

		assert.deepEqual(init.result.serverInfo, { name: '__NAME__', version })
		child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`)

		const call = await request(2, 'tools/call', { name: 'echo', arguments: { message: 'привет' } })

		assert.deepEqual(call.result, {
			content: [
				{ type: 'text', text: 'API_TOKEN is not set. Add it to the env of this server in your MCP config' },
			],
			isError: true,
		})

		// Клиент закрывает stdin, когда сервер больше не нужен: процесс должен выйти сам.
		const exited = once(child, 'exit')

		child.stdin.end()
		assert.deepEqual(await exited, [0, null])
	} finally {
		child.kill()
	}
})

test('serve --http поднимает коннектор на PORT, а вход без своей проверки токена закрыт', async () => {
	const probe = createNetServer()

	await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve))

	const { port } = probe.address() as AddressInfo

	await new Promise((resolve) => probe.close(resolve))

	const base = `http://127.0.0.1:${port}`
	const child = spawn(process.execPath, [CLI, 'serve', '--http'], {
		env: {
			...baseEnv,
			PORT: String(port),
			PUBLIC_URL: base,
			AUTH_SECRET: 'z'.repeat(32),
			XDG_CONFIG_HOME: await mkdtemp(join(tmpdir(), 'mcp-data-')),
		},
		stdio: ['ignore', 'ignore', 'pipe'],
	})

	try {
		// Сервер пишет о старте в stderr: до этого порт ещё не слушается.
		for await (const line of createInterface({ input: child.stderr })) {
			if (line.includes(`listening on :${port}`)) break
		}

		assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true })
		assert.deepEqual(await (await fetch(`${base}/api/status`)).json(), { name: '__NAME__', version })

		await assert.rejects(
			oauthFlow({ base, login: submitForm({ token: 'secret' }) }),
			/Проверка токена не реализована/,
		)
	} finally {
		const exited = once(child, 'exit')

		child.kill('SIGINT')
		await exited
	}
})
