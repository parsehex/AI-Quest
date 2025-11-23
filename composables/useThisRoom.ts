import { useSupabaseClient, useRoute } from '#imports'
import type { Tables } from '~/types/database.types'

export function useThisRoom() {
	const route = useRoute()
	const client = useSupabaseClient()

	const room = useState<Tables<'rooms'> | null>('this_room', () => null)
	const loading = useState<boolean>('this_room_loading', () => false)
	const error = useState<Error | null>('this_room_error', () => null)

	async function fetchRoom() {
		if (!route.params.id) return null

		loading.value = true
		error.value = null

		try {
			const { data, error: err } = await client
				.from('rooms')
				.select(`
          *,
          room_players (
            user_id
          ),
          game_history (
            *
          )
        `)
				.eq('id', route.params.id)
				.single()

			if (err) throw err
			console.log('Fetched room data:', data)
			room.value = data
			return data
		} catch (e) {
			error.value = e as Error
			console.error('Error fetching room:', e)
			return null
		} finally {
			loading.value = false
		}
	}

	// Watch for route changes
	watch(() => route.params.id, (newId) => {
		if (newId) {
			fetchRoom()
		}
	}, { immediate: true })

	onMounted(() => {
		if (!route.params.id) return

		// Realtime subscription
		const subscription = client
			.channel(`room-${route.params.id}`)
			.on('postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'rooms',
					filter: `id=eq.${route.params.id}`
				},
				() => fetchRoom()
			)
			.on('postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'game_history',
					filter: `room_id=eq.${route.params.id}`
				},
				() => fetchRoom()
			)
			.subscribe()

		onUnmounted(() => {
			subscription.unsubscribe()
		})
	})

	return {
		room: readonly(room),
		loading: readonly(loading),
		error: readonly(error),
		refresh: fetchRoom
	}
}
