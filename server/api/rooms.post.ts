import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server'
import { H3Event } from 'h3'
import { useRoomManager } from '../game/GameRoomManager'
import { playChoice } from '../game/handlers/choices'

interface CreateRoomBody {
	name: string
	premise: string
	fastMode: boolean
	playerName: string
}

export default defineEventHandler(async (event: H3Event) => {
	const client = await serverSupabaseClient(event)
	const body = await readBody<CreateRoomBody>(event)
	const roomManager = useRoomManager()

	if (!body.name || !body.premise || !body.playerName) {
		throw createError({
			statusCode: 400,
			message: 'Name, premise and playerName are required'
		})
	}

	const { data: { session } } = await client.auth.getSession()

	if (!session) {
		throw createError({
			statusCode: 401,
			message: 'Unauthorized'
		})
	}

	try {
		const dbRoom = await roomManager.createRoom(
			session.user.id,
			body.name,
			body.premise,
			body.fastMode,
			session.user.id
		)

		// Generate initial turn
		playChoice(dbRoom.id, body.playerName)

		return dbRoom
	} catch (error: any) {
		console.error('Failed to create room:', error)
		throw createError({
			statusCode: 500,
			message: error.message || 'Failed to create room'
		})
	}
})
