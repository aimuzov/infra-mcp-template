import { readVersion, str, tool, type Env } from '@aimuzov/infra-mcp-kit'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

export const NAME = '__NAME__'

const version = readVersion(import.meta.url)

/**
 * Всё, что зависит от пользователя: в stdio берётся из окружения,
 * по HTTP -- из токена доступа.
 */
export type Context = {
	apiToken: string
}

export const loadContext = (env: Env = process.env): Context => ({ apiToken: str(env, 'API_TOKEN') })

const NO_TOKEN = 'API_TOKEN is not set. Add it to the env of this server in your MCP config'

/**
 * Один сервер на stdio-процесс или на HTTP-запрос.
 *
 * Без токена сервер всё равно стартует: машине без ключа лучше увидеть понятную ошибку
 * в ответе инструмента, чем упавший сервер.
 */
export function createServer(context: Context): McpServer {
	const server = new McpServer({ name: NAME, version })

	// Пример. Замени на настоящие инструменты сервиса.
	server.registerTool(
		'echo',
		{
			title: 'Echo',
			description: 'Return the message back. An example tool of the template.',
			inputSchema: { message: z.string().min(1).describe('What to send back') },
		},
		tool(({ message }: { message: string }) => {
			if (!context.apiToken) throw new Error(NO_TOKEN)

			return message
		}),
	)

	return server
}
