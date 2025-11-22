import { useSupabaseClient } from '#imports'
import type { Tables } from '~/types/database.types'

export function useRoomMessages() {
	const route = useRoute()
	const client = useSupabaseClient()

	const messages = useState<Tables<'chat_messages'>[]>('room_messages', () => [])
	const loading = useState<boolean>('room_messages_loading', () => false)
	const error = useState<Error | null>('room_messages_error', () => null)

	async function fetchMessages() {
		const roomId = route.params.id as string
		if (!roomId) return []

		loading.value = true
		error.value = null

		try {
			// First get messages
			const { data, error: err } = await client
				.from('chat_messages')
				.select(`
          *,
          sender:sender_id (
            discord_username,
            discord_avatar
          )
        `)
				.eq('room_id', roomId)
				.order('created_at', { ascending: true })

			if (err) throw err

			// Then get room players to map sender_id to character
			const { data: roomPlayers } = await client
				.from('room_players')
				.select(`
					user_id,
					character:player_characters (
						nickname
					)
				`)
				.eq('room_id', roomId)

			// Create a map of user_id to character nickname
			const characterMap = new Map(
				(roomPlayers || []).map((rp: any) => [rp.user_id, rp.character?.nickname])
			)

			// Attach character info to messages
			const messagesWithCharacters = (data || []).map((msg: any) => ({
				...msg,
				character_nickname: characterMap.get(msg.sender_id)
			}))

			messages.value = messagesWithCharacters
			return messagesWithCharacters
		} catch (e) {
			error.value = e as Error
			return []
		} finally {
			loading.value = false
		}
	}

	async function sendMessage(text: string) {
		const roomId = route.params.id as string
		if (!roomId) throw new Error('No room ID provided')

		loading.value = true
		error.value = null

		try {
			const { data, error: err } = await client
				.from('chat_messages')
				.insert({
					text,
					room_id: roomId,
					sender_id: getClientId()
				})
				.select()
				.single()

			if (err) throw err
			// Optimistically add to local state
			await fetchMessages()
			return data
		} catch (e) {
			error.value = e as Error
			console.error('Error sending message:', e)
			throw e
		} finally {
			loading.value = false
		}
	}

	watch(() => route.params.id, (newId) => {
		if (newId) {
			fetchMessages()
		}
	}, { immediate: true })

	// Setup realtime subscription
	onMounted(() => {
		const roomId = route.params.id as string
		if (!roomId) return

		const subscription = client
			.channel(`chat-messages-${roomId}`)
			.on('postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'chat_messages',
					filter: `room_id=eq.${roomId}`
				},
				() => fetchMessages()
			)
			.subscribe()

		onUnmounted(() => {
			subscription.unsubscribe()
		})
	})

	return {
		messages: readonly(messages),
		loading: readonly(loading),
		error: readonly(error),
		refresh: fetchMessages,
		sendMessage
	}
}
