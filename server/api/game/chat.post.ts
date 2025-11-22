import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { Database } from '~/types/database.types'

export default defineEventHandler(async (event) => {
	const user = await serverSupabaseUser(event)
	const client = await serverSupabaseClient<Database>(event)
	const body = await readBody(event)
	const { roomId, text } = body

	if (!user) {
		throw createError({
			statusCode: 401,
			message: 'Unauthorized'
		})
	}

	if (!roomId || !text) {
		throw createError({
			statusCode: 400,
			message: 'Missing roomId or text'
		})
	}

	// Insert message into database
	const { error } = await client
		.from('chat_messages')
		.insert({
			room_id: roomId,
			sender_id: user.id,
			text: text.trim()
		})

	if (error) {
		throw createError({
			statusCode: 500,
			message: error.message
		})
	}

	return { success: true }
})
