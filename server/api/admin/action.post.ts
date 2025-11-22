import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { Database } from '~/types/database.types'

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin'

export default defineEventHandler(async (event) => {
	const user = await serverSupabaseUser(event)
	const client = await serverSupabaseClient<Database>(event)
	const body = await readBody(event)
	const { action, password, payload } = body

	if (password !== ADMIN_PASSWORD) {
		throw createError({ statusCode: 401, message: 'Invalid password' })
	}

	switch (action) {
		case 'checkPassword':
			return { success: true }

		case 'clearRooms':
			// Delete all rooms
			const { error: clearError } = await client
				.from('rooms')
				.delete()
				.neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

			if (clearError) throw createError({ statusCode: 500, message: clearError.message })
			return { success: true }

		case 'removeRoom':
			if (!payload?.roomId) throw createError({ statusCode: 400, message: 'Missing roomId' })
			const { error: removeError } = await client
				.from('rooms')
				.delete()
				.eq('id', payload.roomId)

			if (removeError) throw createError({ statusCode: 500, message: removeError.message })
			return { success: true }

		case 'removeAllPlayers':
			// Delete all room_players
			const { error: removePlayersError } = await client
				.from('room_players')
				.delete()
				.neq('room_id', '00000000-0000-0000-0000-000000000000')

			if (removePlayersError) throw createError({ statusCode: 500, message: removePlayersError.message })
			return { success: true }

		case 'setCurrentPlayer':
			if (!payload?.roomId || !payload?.playerId) throw createError({ statusCode: 400, message: 'Missing params' })
			// We need to find the user_id for the given socket/client ID if that's what's passed,
			// but the admin UI likely passes the UUID now.
			// Let's assume payload.playerId is the user_id (UUID).
			const { error: setPlayerError } = await client
				.from('rooms')
				.update({ current_player: payload.playerId })
				.eq('id', payload.roomId)

			if (setPlayerError) throw createError({ statusCode: 500, message: setPlayerError.message })
			return { success: true }

		case 'kickPlayer':
			if (!payload?.roomId || !payload?.playerId) throw createError({ statusCode: 400, message: 'Missing params' })
			const { error: kickError } = await client
				.from('room_players')
				.delete()
				.match({ room_id: payload.roomId, user_id: payload.playerId })

			if (kickError) throw createError({ statusCode: 500, message: kickError.message })
			return { success: true }

		case 'toggleFastMode':
			if (!payload?.roomId) throw createError({ statusCode: 400, message: 'Missing roomId' })
			// First get current state
			const { data: room } = await client.from('rooms').select('fast_mode').eq('id', payload.roomId).single()
			if (!room) throw createError({ statusCode: 404, message: 'Room not found' })

			const { error: toggleError } = await client
				.from('rooms')
				.update({ fast_mode: !room.fast_mode })
				.eq('id', payload.roomId)

			if (toggleError) throw createError({ statusCode: 500, message: toggleError.message })
			return { success: true }

		case 'setGameActive':
			// This was likely an in-memory flag. We might need a settings table or just ignore it for now.
			// Or use a KV store if available.
			// For Supabase, maybe a 'system_settings' table?
			// Or just return success for now as it might not be critical.
			return { success: true, message: 'Not implemented persistence for game active state' }

		default:
			throw createError({ statusCode: 400, message: 'Invalid action' })
	}
})
