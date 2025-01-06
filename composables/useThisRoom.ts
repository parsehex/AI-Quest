import { useSupabaseClient, useRoute } from '#imports'
import type { Tables } from '~/types/database.types'

let instance: ReturnType<typeof createThisRoomStore> | null = null

function createThisRoomStore() {
	const route = useRoute()
	const client = useSupabaseClient()
	const room = ref<Tables<'rooms'> | null>(null)
	const loading = ref(false)
	const error = ref<Error | null>(null)

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
          )
        `)
				.eq('id', route.params.id)
				.single()

			if (err) throw err
			room.value = data
			return data
		} catch (e) {
			error.value = e as Error
			return null
		} finally {
			loading.value = false
		}
	}

	onMounted(() => {
		// Initial fetch
		fetchRoom()

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

export function useThisRoom() {
	if (!instance) {
		instance = createThisRoomStore()
	}
	return instance
}
