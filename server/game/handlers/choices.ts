import { Server, Socket } from 'socket.io';
import type { GameRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { LLMManager } from '~/lib/llm';

const log = useLog('handlers/choices');

/** Make any changes to `room.history` before calling this */
const generateAIResponse = async (io: Server, roomManager: GameRoomManager, roomId: string, currentPlayer = '', isRetrying = false) => {
	const room = roomManager.getRoom(roomId);
	if (!room) return;

	const premise = room.premise || '';
	let history = room.history;

	room.aiLoading = true;
	io.to(room.id).emit("roomList", roomManager.getRooms());

	const llm = LLMManager.getInstance();
	const playerNames = history.map(event => event.match(/(.+) chose:/)?.[1]).filter(Boolean);
	const isNewPlayer = playerNames.includes(currentPlayer);
	const prompt = `Assistant is a creative game master crafting a multiplayer interactive story.
Assistant's task is to create a response with the following format:
<intro>
A brief intro of the current situation
</intro>
<narrative>
Detailed description of the events and actions that happen. Talk in the 3rd person to keep it clear who is doing what. Follow up with relevant context and cue ${currentPlayer} to make a decision.
</narrative>
<choices>
- First choice ${currentPlayer} can make
- Next choice
- (Up to 5 total choices)
</choices>
Use the choice text without anything preceding. Create choices which make sense to push the events forward.
Pay attention and react to the latest choice in a natural way.`;

	// disjointed note:
	// i want players to be able to join a room and they get added to the turn order / game
	// here, i need to be able to highlight when a new player is up

	const latestEvent = history.slice(-1)[0] || '';
	history = history.slice(0, -1);

	const fastMode = room.fastMode || false;

	let response = await llm.generateResponse([
		{ role: "system", content: prompt },
		{
			role: "user", content: `Original premise: ${premise}
${history.length ? 'Events:\n' + history.join('\n') : ''}
${latestEvent ? 'Latest event:\n' + latestEvent : ''}${isNewPlayer ? `\n\nNew Player: ${currentPlayer}` : currentPlayer ? `\n\nCurrent Player: ${currentPlayer}` : ''}`
		}
	], fastMode, { roomId, currentPlayer, isRetrying });

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
		await generateAIResponse(io, roomManager, roomId, currentPlayer, true);
	}

	room.lastAiResponse = sections;
	room.currentPlayer = room.players[room.currentTurn || 0]?.id;
	room.aiLoading = false;
	io.to(room.id).emit("roomList", roomManager.getRooms());
};

export const playChoice = async (io: Server, roomManager: GameRoomManager, roomId: string, currentPlayer = '', choice = '') => {
	// if choice is '', regenerate last turn
	const room = roomManager.getRoom(roomId);
	if (!room) return;
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
	await generateAIResponse(io, roomManager, roomId, nextPlayer);
};

export const registerChoiceHandlers = (io: Server, socket: Socket, roomManager: GameRoomManager) => {
	socket.on('makeChoice', async ({ roomId, choice }) => {
		const room = roomManager.getRoom(roomId);
		if (!room || room.currentPlayer !== socket.id) return;
		log.debug("Player", socket.id, "chose", choice, "in room", roomId);

		// Add choice to history
		room.history = room.history || [];
		if (room.history.length > 3) {
			room.history.push('--')
		}
		room.history.push(room.lastAiResponse?.intro || '');
		room.history.push(room.lastAiResponse?.narrative || '');
		room.history.push(`${socket.data.nickname} chose: **${choice}**`);

		// Move to next player
		room.currentTurn = ((room.currentTurn || 0) + 1) % room.players.length;

		const playerName = room.players[room.currentTurn]?.nickname;
		await playChoice(io, roomManager, roomId, playerName, choice);
	});

	socket.on('regenerateResponse', async (roomId: string) => {
		const room = roomManager.getRoom(roomId);
		if (!room) return;
		log.debug('Regenerating response for room', roomId, 'by', socket.id);
		const playerName = socket.data.nickname || 'Anonymous';
		await playChoice(io, roomManager, roomId, playerName);
	});
};
