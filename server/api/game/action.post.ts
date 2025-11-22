import { serverSupabaseUser, serverSupabaseClient } from '#supabase/server'
import { Database } from '~/types/database.types'
import { LLMManager } from '~/lib/llm'
import { TTSManager } from '~/lib/tts'
import { GameMasterSystem, GameMasterUser } from '~/lib/prompts/templates/GameMaster'
import { PlayerCharacter } from '~/types/Game'

export default defineEventHandler(async (event) => {
	const user = await serverSupabaseUser(event)
	const client = await serverSupabaseClient<Database>(event)
	const body = await readBody(event)
	const { roomId, choice } = body

	if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })
	if (!roomId) throw createError({ statusCode: 400, message: 'Missing roomId' })

	// 1. Fetch Room & Players
	const { data: room, error: roomError } = await client
		.from('rooms')
		.select(`
			*,
			room_players (
				user_id,
				client_id,
				is_spectator,
				character_id,
				player_characters (*)
			),
			game_history (
				type,
				text,
				player_id,
				created_at
			)
		`)
		.eq('id', roomId)
		.single()

	if (roomError || !room) {
		throw createError({ statusCode: 404, message: 'Room not found' })
	}

	// 2. Validate Player & Turn
	const roomPlayers = (room.room_players || []).sort((a: any, b: any) =>
		new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
	)

	const player = roomPlayers.find((p: any) => p.user_id === user.id)
	if (!player || player.is_spectator) {
		throw createError({ statusCode: 403, message: 'Not a player in this room' })
	}

	// Sort history by created_at to ensure correct order
	const history = (room.game_history || []).sort((a: any, b: any) =>
		new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
	).map((h: any) => ({
		type: h.type,
		text: h.text,
		player: h.player_id // Note: this is UUID, prompts might expect nickname. We need to map it.
	}))

	// Map player IDs to nicknames for the prompt
	const playerMap = new Map(room.room_players.map((p: any) => [p.user_id, p.player_characters?.nickname || 'Anonymous']))

	const historyForPrompt = history.map((h: any) => ({
		...h,
		player: playerMap.get(h.player) || 'Unknown'
	}))

	// Check if it's player's turn (if strict turns are enforced)
	// For now, we'll assume the client checks this, or we can enforce it here.
	// strict turn check:
	// if (room.current_player !== user.id) { ... }

	// 3. Update History with User Choice
	if (choice) {
		const { error: choiceError } = await client
			.from('game_history')
			.insert({
				room_id: roomId,
				type: 'choice',
				text: choice,
				player_id: user.id
			})

		if (choiceError) throw createError({ statusCode: 500, message: 'Failed to save choice' })

		// Add to local history for prompt
		historyForPrompt.push({
			type: 'choice',
			text: choice,
			player: player.player_characters?.nickname || 'Anonymous'
		})
	}

	// 4. Generate AI Response
	const llm = LLMManager.getInstance()
	const currentPlayerNickname = player.player_characters?.nickname || 'Anonymous'

	// Determine next player (simple round-robin for now, or just same player if solo)
	// Logic from choices.ts:
	const activePlayers = roomPlayers.filter((p: any) => !p.is_spectator)
	const currentActivePlayerIndex = activePlayers.findIndex((p: any) => p.user_id === user.id)
	const nextPlayerIndex = (currentActivePlayerIndex + 1) % activePlayers.length
	const nextPlayer = activePlayers[nextPlayerIndex]
	const nextPlayerCharacter = nextPlayer.player_characters
	const nextPlayerNickname = nextPlayerCharacter?.nickname || 'Anonymous'

	const prompt = GameMasterSystem({ currentPlayer: nextPlayerNickname })
	const userPrompt = GameMasterUser({
		currentPlayer: nextPlayerNickname,
		premise: room.premise,
		history: historyForPrompt,
		latestEvent: choice ? `Player \`${currentPlayerNickname}\` chose: ${choice}` : '',
		isNewPlayer: false, // Simplified
		playerCharacter: nextPlayerCharacter as PlayerCharacter | undefined
	})

	const response = await llm.generateResponse([
		{ role: 'system', content: prompt },
		{ role: 'user', content: userPrompt }
	], room.fast_mode, { roomId })

	// Parse Response
	const sections = {
		intro: response.match(/<intro>(.*?)<\/intro>/s)?.[1]?.trim() || '',
		narrative: response.match(/<narrative>(.*?)<\/narrative>/s)?.[1]?.trim() || '',
		choices: response.match(/<choices>(.*?)<\/choices>/s)?.[1]?.trim().split('\n')
			.map(c => c.replace(/- /, '').trim()) || []
	}

	// 5. Generate TTS (Optional)
	let ttsUrl = undefined
	if (sections.narrative) {
		try {
			const tts = TTSManager.getInstance()
			const textToTTS = sections.intro + '\n' + sections.narrative
			const ttsResult = await tts.generateAudio(textToTTS, { roomId })
			if (ttsResult?.hash) {
				ttsUrl = `/api/tts/${ttsResult.hash}`
			}
		} catch (e) {
			console.error('TTS Generation failed', e)
		}
	}

	// 6. Update Room State
	const lastAiResponse = {
		...sections,
		tts: ttsUrl
	}

	// Save AI response to history (intro + narrative)
	const newHistoryItems = []
	if (sections.intro) newHistoryItems.push({ room_id: roomId, type: 'intro', text: sections.intro })
	if (sections.narrative) newHistoryItems.push({ room_id: roomId, type: 'narrative', text: sections.narrative })

	if (newHistoryItems.length > 0) {
		await client.from('game_history').insert(newHistoryItems)
	}

	// Update room (current_player, last_ai_response, current_turn)
	const { error: updateError } = await client
		.from('rooms')
		.update({
			last_ai_response: lastAiResponse,
			current_player: nextPlayer.user_id,
			current_turn: (room.current_turn || 0) + 1
		})
		.eq('id', roomId)

	if (updateError) throw createError({ statusCode: 500, message: 'Failed to update room' })

	return { success: true }
})
