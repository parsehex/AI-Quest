import { type Socket } from 'socket.io';
import { useRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { LLMManager } from '~/lib/llm';
import { Room } from '~/types/Game';
import { useIO } from '~/server/plugins/socket.io';
import GameMasterSystem from '~/lib/prompts/templates/GameMasterSystem';
import GameMasterUser from '~/lib/prompts/templates/GameMasterUser';

const log = useLog('handlers/choices');

export const updateRoom = (roomId: string, updateFn: (room: Room) => void) => {
	const roomManager = useRoomManager();
	const io = useIO();
	const room = roomManager.getRoom(roomId);
	if (!room) return log.error('Room not found:', roomId);
	updateFn(room);
	roomManager.saveRoom(room);
	io.to(roomId).emit('roomList', roomManager.getRooms());
}

/** Make any changes to `room.history` before calling this */
const generateAIResponse = async (roomId: string, currentPlayer = '', isRetrying = false) => {
	const roomManager = useRoomManager();

	const room = roomManager.getRoom(roomId);
	if (!room) return;

	const premise = room.premise || '';
	let history = room.history;

	updateRoom(roomId, room => {
		room.aiLoading = { message: isRetrying ? 'Bad response from AI. Retrying...' : 'Generating next turn...' };
	});

	const llm = LLMManager.getInstance();
	const playerNames = history.map(event => event.match(/(.+) chose:/)?.[1]).filter(Boolean);
	const isNewPlayer = playerNames.includes(currentPlayer);
	const prompt = GameMasterSystem({ currentPlayer });

	const latestEvent = history.slice(-1)[0] || '';
	history = history.slice(0, -1);

	let response = await llm.generateResponse([
		{ role: "system", content: prompt },
		{
			role: "user", content: GameMasterUser({
				currentPlayer,
				premise,
				history,
				latestEvent,
				isNewPlayer
			}),
		}
	], room.fastMode, { roomId, currentPlayer, isRetrying });

	// The last closing tag is often cut off in LLM responses
	if (!response.includes('</choices>') && response.includes('<choices>')) {
		response += '</choices>';
	}

	// Parse sections
	const sections = {
		intro: response.match(/<intro>(.*?)<\/intro>/s)?.[1] || '',
		narrative: response.match(/<narrative>(.*?)<\/narrative>/s)?.[1] || '',
		choices: response.match(/<choices>(.*?)<\/choices>/s)?.[1].trim().split('\n') || []
	};
	sections.intro = sections.intro.trim();
	sections.narrative = sections.narrative.trim();
	sections.choices = sections.choices.map(choice => choice.replace(/- /, '').trim());

	if (sections.choices.length === 0) {
		log.log("No choices found, regenerating response");
		await generateAIResponse(roomId, currentPlayer, true);
	}

	updateRoom(roomId, room => {
		room.lastAiResponse = sections;
		room.currentPlayer = room.players[room.currentTurn || 0]?.id;
		room.aiLoading = undefined;
	});
};

export const playChoice = (roomId: string, currentPlayer = '', choice = '') => {
	const roomManager = useRoomManager();

	// if choice is '', regenerate last turn
	const room = roomManager.getRoom(roomId);
	if (!room) return;
	updateRoom(roomId, room => {
		const history = room.history || [];
		if (currentPlayer && choice) {
			// Player made a choice -- add to history and move to next turn
			if (room.history.length > 3) room.history.push('--')
			room.history.push(room.lastAiResponse?.intro || '');
			room.history.push(room.lastAiResponse?.narrative || '');
			room.history.push(`${currentPlayer} chose: **${choice}**`);
			room.currentTurn = ((room.currentTurn || 0) + 1) % room.players.length;
		} else {
			// regenerate last turn
			room.history = history.slice(0, -3);
			if (room.history[room.history.length - 1] === '--') room.history.pop();
			room.currentTurn = ((room.currentTurn || 0) - 1) % room.players.length;
			if (room.currentTurn < 0) room.currentTurn = room.players.length - 1;
			if (room.currentTurn >= room.players.length) room.currentTurn = 0;
		}
		const nextPlayer = room.players[room.currentTurn]?.nickname;
		generateAIResponse(roomId, nextPlayer);
	});
};

export const registerChoiceHandlers = (socket: Socket) => {
	const roomManager = useRoomManager();

	socket.on('makeChoice', ({ roomId, choice }) => {
		const room = roomManager.getRoom(roomId);
		if (!room || room.currentPlayer !== socket.id) return;
		log.debug("Player", socket.id, "chose", choice, "in room", roomId);

		const playerName = room.players.find(player => player.id === socket.id)?.nickname || 'Anonymous';
		playChoice(roomId, playerName, choice);
	});

	socket.on('regenerateResponse', (roomId: string) => {
		const room = roomManager.getRoom(roomId);
		if (!room) return;
		log.debug('Regenerating response for room', roomId, 'by', socket.id);
		const playerName = socket.data.nickname || 'Anonymous';
		playChoice(roomId, playerName);
	});
};
