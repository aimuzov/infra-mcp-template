<script lang="ts">
	import Activity from '@lucide/svelte/icons/activity'

	import Alert from '@aimuzov/infra-site-kit/ui/alert.svelte'
	import Badge from '@aimuzov/infra-site-kit/ui/badge.svelte'
	import Card from '@aimuzov/infra-site-kit/ui/card.svelte'
	import Skeleton from '@aimuzov/infra-site-kit/ui/skeleton.svelte'

	// Пример острова: страница собрана статикой, а свежий статус он спрашивает у сервера сам.
	type Status = { name: string; version: string }

	let state = $state<{ kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; data: Status }>({ kind: 'loading' })

	$effect(() => {
		fetch('/api/status', { headers: { accept: 'application/json' } })
			.then(async (res) => {
				state = res.ok ? { kind: 'ready', data: (await res.json()) as Status } : { kind: 'error' }
			})
			.catch(() => (state = { kind: 'error' }))
	})
</script>

<Card title="Сервер" icon={Activity}>
	{#if state.kind === 'loading'}
		<div role="status" aria-label="Загружаем статус">
			<Skeleton width="40%" />
		</div>
	{:else if state.kind === 'error'}
		<Alert variant="danger">Сервер не ответил. Обнови страницу чуть позже.</Alert>
	{:else}
		<p>
			Работает версия <Badge mono>{state.data.version}</Badge>
		</p>
	{/if}
</Card>
