import { useSupabaseClient } from '#imports'
import type { Tables } from '~/types/database.types'

let instance: ReturnType<typeof createRoomsStore> | null = null

function createRoomsStore() {
	const route = useRoute()
	const client = useSupabaseClient()
	const rooms = ref<Tables<'rooms'>[]>([])
	const loading = ref(false)
	const error = ref<Error | null>(null)

	async function fetchRooms() {
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
				.order('created_at', { ascending: false })

			if (err) throw err
			rooms.value = data || []
			return data
		} catch (e) {
			error.value = e as Error
			return []
		} finally {
			loading.value = false
		}
	}

	onMounted(() => {
		if (route.name !== 'room-id') {
			// update on a timer on the home page
			const interval = setInterval(fetchRooms, 10000)
			onUnmounted(() => {
				clearInterval(interval)
			})
			return;
		}

		// Realtime in game room
		const subscription = client
			.channel('rooms-channel')
			.on('postgres_changes',
				{ event: '*', schema: 'public', table: 'rooms' },
				() => fetchRooms()
			)
			.subscribe()

		onUnmounted(() => {
			subscription.unsubscribe()
		})
	})

	return {
		rooms: readonly(rooms),
		loading: readonly(loading),
		error: readonly(error),
		refresh: fetchRooms
	}
}

export function useRooms() {
	if (!instance) {
		instance = createRoomsStore()
	}
	return instance
}
