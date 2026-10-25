import mcpPages from '@aimuzov/infra-mcp-kit/astro'
import svelte from '@astrojs/svelte'
import { defineConfig } from 'astro/config'

export default defineConfig({
	// Страницы живут в `src/frontend`, как у сайтов, рядом с кодом сервера в `src`.
	srcDir: './src/frontend',
	// Сервер раздаёт отсюда статику: `publicDir` в `src/http.ts`.
	outDir: './build/public',
	integrations: [
		svelte(),
		mcpPages({
			service: {
				name: '__NAME__',
				repo: 'https://github.com/aimuzov/__NAME__',
				tagline: '__DESCRIPTION__',
				tools: ['echo'],
			},
			// Поля те же, что у `tokenFormLogin` в `src/http.ts`: сервер собирает их по имени.
			tokenForm: {
				title: 'Подключение __NAME__',
				lead: 'Токен останется только внутри зашифрованного токена доступа, сервер его не хранит.',
				fields: [{ name: 'token', label: 'API-токен', type: 'password' }],
			},
		}),
	],
})
