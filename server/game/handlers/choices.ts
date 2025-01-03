import { type Socket } from 'socket.io';
import { updateRoom, useRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { LLMManager } from '~/lib/llm';
import { GameMasterSystem, GameMasterUser } from '~/lib/prompts/templates/GameMaster';
import { TTSManager } from '~/lib/tts';

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
	const playerNames = history.filter(evt => evt.type === 'choice').map(evt => evt.player);
	const isNewPlayer = playerNames.includes(currentPlayer);
	const playerCharacter = room.players.find(player => player.nickname === currentPlayer)?.character;
	const prompt = GameMasterSystem({ currentPlayer });

	const latestEvent = history.slice(-1)[0];
	const latestEventText = latestEvent?.type === 'choice' ? `Player \`${latestEvent.player}\` chose: ${latestEvent.text}` : latestEvent?.text;
	history = history.slice(0, -1);

	let response = await llm.generateResponse([
		{ role: 'system', content: prompt },
		{
			role: 'user', content: GameMasterUser({
				currentPlayer,
				premise,
				history,
				latestEvent: latestEventText,
				isNewPlayer,
				playerCharacter
			}),
		}
	], room.fastMode, { roomId, currentPlayer, isRetrying, playerCharacter, history });

	// The last closing tag is often cut off in LLM responses
	if (!response.includes('</choices>') && response.includes('<choices>')) {
		response += '</choices>';
	}

	// Parse sections
	const sections = {
		intro: response.match(/<intro>(.*?)<\/intro>/s)?.[1] || '',
		narrative: response.match(/<narrative>(.*?)<\/narrative>/s)?.[1] || '',
		choices: response.match(/<choices>(.*?)<\/choices>/s)?.[1].trim().split('\n') || [],
		tts: undefined as string | undefined
	};
	sections.intro = sections.intro.trim();
	sections.narrative = sections.narrative.trim();
	sections.choices = sections.choices.map(choice => choice.replace(/- /, '').trim());

	if (sections.choices.length === 0) {
		log.warn({ _ctx: { roomId } }, 'No choices found, regenerating response');
		await generateAIResponse(roomId, currentPlayer, true);
	}

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

export const playChoice = (roomId: string, currentPlayer = '', choice = '') => {
	updateRoom(roomId, room => {
		const { lastAiResponse } = room;

		const history = room.history || [];
		if (currentPlayer && choice) {
			if (!lastAiResponse) {
				log.error({ _ctx: { roomId, currentPlayer } }, 'No last AI response found');
				return;
			}
			// Player made a choice -- add to history and move to next turn
			// TODO game history manager
			room.history.push({ type: 'intro', text: lastAiResponse.intro });
			room.history.push({ type: 'narrative', text: lastAiResponse.narrative });
			room.history.push({ type: 'choice', text: choice, player: currentPlayer });
			room.currentTurn = ((room.currentTurn || 0) + 1) % room.players.length;
		} else {
			// TODO fix
			// Regenerate last turn -- remove last turn and try again
			room.history = history.slice(0, -3);
			const curPlayerindex = room.players.findIndex(player => player.nickname === currentPlayer);
			room.currentTurn = curPlayerindex;
		}
		const nextPlayer = room.players[room.currentTurn]?.nickname;
		generateAIResponse(roomId, nextPlayer);
	});
};

export const registerChoiceHandlers = (socket: Socket) => {
	const roomManager = useRoomManager();

	socket.on('makeChoice', ({ roomId, choice }) => {
		const room = roomManager.getRoom(roomId);
		const SocketId = socket.id;
		if (!room || room.currentPlayer !== SocketId) return;
		log.debug({ _ctx: { roomId, SocketId, choice } }, 'Player chose');

		const playerName = room.players.find(player => player.id === SocketId)?.nickname || 'Anonymous';
		playChoice(roomId, playerName, choice);
	});

	socket.on('regenerateResponse', (roomId: string) => {
		const room = roomManager.getRoom(roomId);
		if (!room) return;
		const SocketId = socket.id;
		log.debug({ _ctx: { roomId, SocketId } }, 'Regenerating response');
		const playerName = socket.data.nickname || 'Anonymous';
		playChoice(roomId, playerName);
	});
};
