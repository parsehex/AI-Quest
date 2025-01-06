import { useSupabaseClient } from '#imports'
import type { Tables } from '~/types/database.types'

let instance: ReturnType<typeof createRoomMessagesStore> | null = null

function createRoomMessagesStore() {
	const route = useRoute()
	const client = useSupabaseClient()
	const messages = ref<Tables<'chat_messages'>[]>([])
	const loading = ref(false)
	const error = ref<Error | null>(null)

	async function fetchMessages() {
		const roomId = route.params.id as string
		if (!roomId) return []

		loading.value = true
		error.value = null

		try {
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
			messages.value = data || []
			return data
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

		console.log('msg', getClientId());

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
			return data
		} catch (e) {
			error.value = e as Error
			throw e
		} finally {
			loading.value = false
		}
	}

	watch(() => route.params.id, () => {
		fetchMessages()
	}, { immediate: true })

	onMounted(() => {
		const roomId = route.params.id as string
		if (!roomId) return

		const subscription = client
			.channel('chat-messages-channel')
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

export function useRoomMessages() {
	if (!instance) {
		instance = createRoomMessagesStore()
	}
	return instance
}
