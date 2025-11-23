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

export interface RoomPlayerWithJoins {
	is_spectator: boolean
	user: Profile
	character: PlayerCharacter
}

export function useRoomPlayers() {
	const route = useRoute()
	const client = useSupabaseClient()

	const players = useState<RoomPlayerWithJoins[]>('room_players', () => [])
	const loading = useState<boolean>('room_players_loading', () => false)
	const error = useState<Error | null>('room_players_error', () => null)

	const user = useSupabaseUser()
	const me = ref<RoomPlayerWithJoins | undefined>(undefined)

	watch([players, user], ([newPlayers, newUser]) => {
		if (!newUser) {
			me.value = undefined
			return
		}
		me.value = newPlayers.find(p => p.user.id === newUser.id)
	}, { immediate: true })

	async function fetchPlayers(): Promise<RoomPlayerWithJoins[] | null> {
		if (!route.params.id) {
			return null
		}

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
			players.value = data || []
			return data
		} catch (e) {
			error.value = e as Error
			console.error('Error fetching room players:', e)
			return null
		} finally {
			loading.value = false
		}
	}

	// Watch for route changes to refetch
	watch(() => route.params.id, (newId) => {
		if (newId) {
			fetchPlayers()
		}
	}, { immediate: true })

	onMounted(() => {
		if (!route.params.id) return

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
		me,
		loading: readonly(loading),
		error: readonly(error),
		refresh: fetchPlayers
	}
}
