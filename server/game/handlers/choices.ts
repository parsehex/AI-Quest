import { type Socket } from 'socket.io';
import { updateRoom, useRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { LLMManager } from '~/lib/llm';
import { GameMaster, Thoughts } from '~/lib/prompts/templates';
import { TTSManager } from '~/lib/tts';
import { delay, extractOutput } from '~/lib/utils';

const log = useLog('handlers/choices');

// TODO need to handle requesting to generate multiple times

/** Make any changes to `room.history` before calling this */
const generateAIResponse = async (roomId: string, currentPlayer = '', isRetrying = false) => {
	const roomManager = useRoomManager();

	updateRoom(roomId, room => {
		room.aiLoading = { message: isRetrying ? 'Bad response from AI. Retrying...' : 'Generating next turn...' };
	});

	const room = roomManager.getRoom(roomId);
	if (!room) return;
	const premise = room.premise || '';
	let history = room.history;

	const llm = LLMManager.getInstance();
	const playerNames = history.map(evt => evt.player);
	const isNewPlayer = playerNames.includes(currentPlayer);
	const playerCharacter = room.players.find(player => player.nickname === currentPlayer)?.character;
	const roomName = room.name;

	let thoughts = await llm.generateResponse([
		{ role: 'system', content: Thoughts.System({}) },
		{ role: 'user', content: GameMaster.User({ currentPlayer, premise, history, isNewPlayer, playerCharacter }) }
	], room.fastMode, { roomId, roomName, currentPlayer, isRetrying, playerCharacter, history }, 'huihui_ai/llama3.2-abliterate:3b-instruct');
	thoughts = extractOutput(thoughts);
	console.log('Thoughts', thoughts);
	const prompt = GameMaster.System({ currentPlayer, thoughts });

	// const latestEvent = history.slice(-1)[0];
	// const latestEventText = latestEvent ? `Player \`${latestEvent.player}\` chose: ${latestEvent.choice}` : '';
	// console.log('Generating response', { currentPlayer, history });

	let response = await llm.generateResponse([
		{ role: 'system', content: prompt },
		{
			role: 'user', content: GameMaster.User({
				currentPlayer,
				premise,
				history,
				roomName,
				// latestEvent: latestEventText,
				isNewPlayer,
				playerCharacter
			}),
		}
	], room.fastMode, { roomId, roomName, currentPlayer, isRetrying, playerCharacter, history });

	// The last closing tag is often cut off in LLM responses
	if (!response.includes('</choices>') && response.includes('<choices>')) {
		response += '</choices>';
	}

	// Parse sections
	const sections = {
		intro: response.match(/<\/?intro>(.*?)<\/intro>/s)?.[1] || '',
		narrative: response.match(/<\/?narrative>(.*?)<\/narrative>/s)?.[1] || '',
		choices: response.match(/<\/?choices>(.*?)<\/choices>/s)?.[1].trim().split('\n') || [],
		tts: undefined as string | undefined
	};
	sections.intro = sections.intro.trim();
	sections.narrative = sections.narrative.trim();
	sections.choices = sections.choices.map(choice => choice.replace(/- /, '').trim());

	if (sections.choices.length === 0) {
		log.warn({ _ctx: { roomId } }, 'No choices found, regenerating response');
		await generateAIResponse(roomId, currentPlayer, true);
	}

	// TODO get different tenses for choices using 3b model
	//   (i.e. extract each choice into 1st person, 2nd person, 3rd person)
	// use 2nd person for choice buttons
	// 1st person when showing in history in UI
	// 3rd person to use in history section for the AI
	// TODO generate profile pictures for characters
	// disjointed: use 3b to let players chat with the GM

	if (sections.narrative) {
		updateRoom(roomId, async room => {
			const tts = TTSManager.getInstance();
			const textToTTS = sections.intro + '\n' + sections.narrative;
			const ttsResult = await tts.generateAudio(textToTTS, { roomId, currentPlayer: room.currentPlayer });
			if (ttsResult?.hash && room.lastAiResponse) {
				room.lastAiResponse.tts = `/api/tts/${ttsResult.hash}`;
			}
		});
	}

	updateRoom(roomId, room => {
		room.lastAiResponse = sections;
		room.currentPlayer = room.players[room.currentTurn || 0]?.id;
		room.aiLoading = undefined;
	});
};

interface TurnManager {
	currentTurn: number;
	players: Array<{ id: string; nickname: string }>;
}


const validatePlayerTurn = (room: TurnManager, playerId: string): boolean => {
	const currentPlayer = room.players[room.currentTurn];
	return currentPlayer?.id === playerId;
};

export const playChoice = (roomId: string, currentPlayer = '', choice = '') => {
	const roomManager = useRoomManager();
	const room = roomManager.getRoom(roomId);
	if (!room) return;

	updateRoom(roomId, async room => {
		const { lastAiResponse } = room;

		if (currentPlayer && choice) {
			if (!lastAiResponse) {
				log.error({ _ctx: { roomId, currentPlayer } }, 'No last AI response found');
				return;
			}

			// Validate current player's turn
			const playerIndex = room.players.findIndex(p => p.nickname === currentPlayer);
			if (playerIndex === -1 || playerIndex !== room.currentTurn) {
				log.error({ _ctx: { roomId, currentPlayer } }, 'Invalid player turn');
				return;
			}

			// Create new history entry
			const historyEntry = {
				intro: lastAiResponse.intro,
				narrative: lastAiResponse.narrative,
				choice,
				player: currentPlayer
			};
			console.log('adding', historyEntry);

			// Ensure history is initialized as an array
			room.history = Array.isArray(room.history) ? [...room.history, historyEntry] : [historyEntry];

			// Advance to next turn
			room.currentTurn = ((playerIndex + 1) % room.players.length);
		} else {
			console.log(typeof room.history, Array.isArray(room.history), room.history);
			// Regenerating last turn or generating first turn
			room.history = Array.isArray(room.history) ? room.history.slice(0, -1) : [];
			const playerIndex = room.players.findIndex(p => p.nickname === currentPlayer);
			if (playerIndex !== -1) {
				room.currentTurn = playerIndex;
			}
		}

		const nextPlayer = room.players[room.currentTurn]?.nickname;
		if (!nextPlayer) {
			log.error({ _ctx: { roomId } }, 'No valid next player found');
			return;
		}

		await delay(25)
		generateAIResponse(roomId, nextPlayer);
	});
};

export const registerChoiceHandlers = (socket: Socket) => {
	const roomManager = useRoomManager();

	socket.on('makeChoice', ({ roomId, choice }) => {
		const room = roomManager.getRoom(roomId);
		if (!room) return;

		if (!validatePlayerTurn(room, socket.id)) {
			log.warn({ _ctx: { roomId, socketId: socket.id } }, 'Player tried to act out of turn');
			return;
		}

		const player = room.players.find(p => p.id === socket.id);
		if (!player) {
			log.error({ _ctx: { roomId, socketId: socket.id } }, 'Player not found in room');
			return;
		}

		console.log('Player made choice', { roomId, player: player.nickname });
		playChoice(roomId, player.nickname, choice);
	});

	socket.on('regenerateResponse', (roomId: string) => {
		const room = roomManager.getRoom(roomId);
		// TODO if there are no players and this is the previous player, acknowledge/welcome them back

		if (!room) return;
		const SocketId = socket.id;
		const playerName = socket.data.nickname || 'Anonymous';
		log.info({ _ctx: { roomId, SocketId, playerName } }, 'Regenerating response');
		console.log('Regenerating response', { roomId, playerName });
		playChoice(roomId, playerName);
	});
};
