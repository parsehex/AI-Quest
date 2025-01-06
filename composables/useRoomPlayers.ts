import { useSupabaseClient, useRoute } from '#imports'
import type { Tables } from '~/types/database.types'

interface Profile {
	id: string
	discord_username: string
	discord_avatar: string
}

interface PlayerCharacter {
	id: string
	nickname: string
	class: string
	race: string
}

interface RoomPlayerWithJoins {
	is_spectator: boolean
	user: Profile
	character: PlayerCharacter
}

let instance: ReturnType<typeof createRoomPlayersStore> | null = null

function createRoomPlayersStore() {
	const route = useRoute()
	const client = useSupabaseClient()
	const players = ref<RoomPlayerWithJoins[]>([])
	const me = computed(() => players.value.find(p => p.user.id === getClientId()))
	const loading = ref(false)
	const error = ref<Error | null>(null)

	async function fetchPlayers(): Promise<RoomPlayerWithJoins[] | null> {
		if (!route.params.id) return null

		loading.value = true
		error.value = null

		try {
			const { data, error: err } = await client
				.from('room_players')
				.select(`
          *,
          user: profiles (
            id,
            discord_username,
            discord_avatar
          ),
          character: player_characters (
            id,
            nickname,
            class,
            race
          )
        `)
				.eq('room_id', route.params.id) as any

			if (err) throw err
			players.value = data
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
		fetchPlayers()

		// Realtime subscription
		const subscription = client
			.channel(`room-players-${route.params.id}`)
			.on('postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'room_players',
					filter: `room_id=eq.${route.params.id}`
				},
				() => fetchPlayers()
			)
			.subscribe()

		onUnmounted(() => {
			subscription.unsubscribe()
		})
	})

	return {
		players: readonly(players),
		me: readonly(me),
		loading: readonly(loading),
		error: readonly(error),
		refresh: fetchPlayers
	}
}

export function useRoomPlayers() {
	if (!instance) {
		instance = createRoomPlayersStore()
	}
	return instance
}
