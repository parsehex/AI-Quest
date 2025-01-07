import { type Socket } from 'socket.io';
import { useRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { LLMManager } from '~/lib/llm';
import { GameMasterSystem, GameMasterUser } from '~/lib/prompts/templates/GameMaster';
import { TTSManager } from '~/lib/tts';
import { useIO } from '~/server/plugins/socket.io';
import { delay } from '~/lib/utils';
import { AILoadingState } from '~/types/Game';

const log = useLog('handlers/choices');

// In-memory loading state tracking
export const roomLoadingStates = new Map<string, AILoadingState>();

const updateLoadingState = (roomId: string, io: ReturnType<typeof useIO>, loadingState: AILoadingState | null) => {
	if (loadingState) {
		roomLoadingStates.set(roomId, loadingState);
	} else {
		roomLoadingStates.delete(roomId);
	}
	io.to(roomId).emit('aiLoadingState', { roomId, loadingState });
};

const generateAIResponse = async (roomId: string, currentPlayer = '', isRetrying = false) => {
	const roomManager = useRoomManager();
	const io = useIO();
	const room = roomManager.getRoom(roomId);

	if (!room) return;

	updateLoadingState(roomId, io, {
		message: isRetrying ? 'Bad response from AI. Retrying...' : 'Generating next turn...'
	});

	const premise = room.premise || '';
	let history = room.history;

	const llm = LLMManager.getInstance();
	const playerNames = history
		.filter(evt => evt.type === 'choice')
		.filter(evt => !room.players.find(p => p.nickname === evt.player)?.isSpectator)
		.map(evt => evt.player);
	const isNewPlayer = playerNames.includes(currentPlayer);
	const playerCharacter = room.players.find(player => player.nickname === currentPlayer)?.character;
	const prompt = GameMasterSystem({ currentPlayer });

	const latestEvent = history.slice(-1)[0];
	const latestEventText = latestEvent?.type === 'choice' ?
		`Player \`${latestEvent.player}\` chose: ${latestEvent.text}` :
		latestEvent?.text;
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
	], room.fast_mode, { roomId, currentPlayer, isRetrying, playerCharacter, history });

	if (!response.includes('</choices>') && response.includes('<choices>')) {
		response += '</choices>';
	}

	const sections = {
		intro: response.match(/<intro>(.*?)<\/intro>/s)?.[1]?.trim() || '',
		narrative: response.match(/<narrative>(.*?)<\/narrative>/s)?.[1]?.trim() || '',
		choices: response.match(/<choices>(.*?)<\/choices>/s)?.[1]?.trim().split('\n')
			.map(choice => choice.replace(/- /, '').trim()) || [],
		// TODO add LLM output section for text that describes the choice in the thrid person
		//   i.e. "[Player] did [whatever]"
		// to be used for stream of status updates on the home page
		//   to show what's going on across all games
		tts: undefined as string | undefined
	};

	if (sections.choices.length === 0) {
		log.warn({ _ctx: { roomId } }, 'No choices found, regenerating response');
		await generateAIResponse(roomId, currentPlayer, true);
		return;
	}

	if (sections.narrative) {
		try {
			const tts = TTSManager.getInstance();
			const textToTTS = sections.intro + '\n' + sections.narrative;
			const ttsResult = await tts.generateAudio(textToTTS, {
				roomId,
				currentPlayer: room.current_player
			});
			if (ttsResult?.hash) {
				sections.tts = `/api/tts/${ttsResult.hash}`;
			}
		} catch (error) {
			log.error({ _ctx: { roomId, currentPlayer } }, 'Failed to generate TTS', error);
		}
	}

	updateLoadingState(roomId, io, null);

	await roomManager.updateRoom(roomId, {
		last_ai_response: sections,
		current_player: room.players[room.current_turn || 0]?.clientId
	});
};

export const playChoice = async (roomId: string, currentPlayer = '', choice = '') => {
	const roomManager = useRoomManager();
	const room = roomManager.getRoom(roomId);
	if (!room) return;

	const activePlayers = room.players.filter(p => !p.isSpectator);
	if (activePlayers.length === 0) return;

	let history = room.history || [];
	let currentTurn = room.current_turn || 0;

	if (currentPlayer && choice) {
		if (!room.last_ai_response) {
			log.error({ _ctx: { roomId, currentPlayer } }, 'No last AI response found');
			return;
		}

		history = [
			...history,
			{ type: 'intro', text: room.last_ai_response.intro },
			{ type: 'narrative', text: room.last_ai_response.narrative },
			{ type: 'choice', text: choice, player: currentPlayer }
		];

		const currentActivePlayerIndex = activePlayers.findIndex(p => p.nickname === currentPlayer);
		currentTurn = ((currentActivePlayerIndex + 1) % activePlayers.length);
	} else {
		// Regenerating last turn
		history = history.slice(0, -3);
		currentTurn = activePlayers.findIndex(player => player.nickname === currentPlayer);
	}

	console.log('new history', history);

	await roomManager.updateRoom(roomId, {
		history,
		current_turn: currentTurn
	});

	const nextPlayer = room.players[currentTurn]?.nickname;
	await generateAIResponse(roomId, nextPlayer);
};

export const registerChoiceHandlers = (socket: Socket) => {
	const roomManager = useRoomManager();
	const io = useIO();

	socket.on('makeChoice', ({ roomId, choice }) => {
		const room = roomManager.getRoom(roomId);
		const socketId = socket.id;
		const player = room?.players.find(p => p.id === socketId);

		if (!room || !player || room.current_player !== socketId || player.isSpectator) return;
		log.debug({ _ctx: { roomId, socketId, choice } }, 'Player chose');

		const playerName = player?.nickname || 'Anonymous';
		playChoice(roomId, playerName, choice);
	});

	socket.on('regenerateResponse', (roomId: string) => {
		const room = roomManager.getRoom(roomId);
		const socketId = socket.id;
		const player = room?.players.find(p => p.id === socketId);

		if (!room || !player || player.isSpectator) return;
		log.debug({ _ctx: { roomId, socketId } }, 'Regenerating response');

		const playerName = player.nickname || 'Anonymous';
		playChoice(roomId, playerName);
	});

	socket.on('requestTurn', async (roomId: string) => {
		const room = roomManager.getRoom(roomId);
		const socketId = socket.id;
		const player = room?.players.find(p => p.id === socketId);

		if (!room || !player) return;

		const currentPlayer = room.players[room.current_turn || 0]?.nickname;
		if (currentPlayer && currentPlayer !== player.nickname) {
			log.warn({ _ctx: { roomId, socketId } }, 'Not player\'s turn');
			return;
		}

		if (player.isSpectator) {
			await roomManager.updateRoom(roomId, {
				players: room.players.map(p =>
					p.id === socketId ? { ...p, isSpectator: false } : p
				),
			});

			if (room.players.length > 1) return;
			await delay(25);
		}

		log.debug({ _ctx: { roomId, socketId } }, 'Requesting turn');
		await playChoice(roomId, player.nickname);
	});
};
