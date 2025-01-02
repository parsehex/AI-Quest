import { Server, Socket } from 'socket.io';
import { RoomManager } from './rooms';
import { Message } from '~/types/Game';
import { LLMManager } from '~/lib/llm';
import { useLog } from '~/composables/useLog';

const log = useLog('socket-handlers');

const generateAIResponse = async (roomId: string, premise: string, io: Server, roomManager: RoomManager, history: string[] = [], currentPlayer = '') => {
	const room = roomManager.getRoom(roomId);
	if (!room) return;

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
	// console.log(prompt);

	// disjointed note:
	// i want players to be able to join a room and they get added to the turn order / game
	// here, i need to be able to highlight when a new player is up

	const latestEvent = history.slice(-1)[0] || '';
	history = history.slice(0, -1);

	const fastMode = room.fastMode || false;

	const response = await llm.generateResponse([
		{ role: "system", content: prompt },
		{
			role: "user", content: `Original premise: ${premise}
${history.length ? 'Events:\n' + history.join('\n') : ''}
${latestEvent ? 'Latest event:\n' + latestEvent : ''}${isNewPlayer ? `\n\nNew Player: ${currentPlayer}` : currentPlayer ? `\n\nCurrent Player: ${currentPlayer}` : ''}`
		}
	], fastMode);

	console.log("AI Response:", response);

	// Parse sections
	const sections = {
		intro: response.match(/<intro>(.*?)<\/intro>/s)?.[1] || '',
		narrative: response.match(/<narrative>(.*?)<\/narrative>/s)?.[1] || '',
		choices: response.match(/<choices>(.*?)<\/choices>/s)?.[1].trim().split('\n') || []
	};
	sections.choices = sections.choices.map(choice => choice.replace(/- /, ''));

	console.log(sections.choices);
	if (sections.choices.length === 0) {
		console.log("No choices found, regenerating response");
		await generateAIResponse(roomId, premise, io, roomManager, history, currentPlayer);
	}

	room.lastAiResponse = sections;
	room.currentPlayer = room.players[room.currentTurn || 0]?.id;
	room.aiLoading = false;
	io.to(room.id).emit("roomList", roomManager.getRooms());
};

export const registerRoomHandlers = (io: Server, socket: Socket, roomManager: RoomManager) => {
	let clientIdMap = new Map<string, string>();

	socket.on('identify', (clientId: string) => {
		log.debug('Identified client:', clientId, 'with socket:', socket.id);
		clientIdMap.set(clientId, socket.id);
	});

	socket.on("createRoom", async (roomName: string, premise: string, fastMode: boolean) => {
		const playerName = socket.data.nickname || 'Anonymous';
		const room = await roomManager.createRoom(socket.id, roomName, premise, fastMode, playerName);
		socket.join(room.id);

		// Generate initial AI response
		await generateAIResponse(room.id, premise, io, roomManager, [], playerName);
	});

	// Add to existing handlers
	socket.on('joinRoom', async ({ roomId, nickname, clientId }) => {
		const room = roomManager.getRoom(roomId);
		if (room) {
			socket.join(roomId);

			const existingPlayer = room.players.find(p => p.clientId === clientId);
			if (existingPlayer) {
				existingPlayer.id = socket.id;
			} else {
				await roomManager.joinRoom(socket.id, roomId, nickname, clientId);
			}

			// this might cause issues playing multiple games at once
			socket.data.nickname = nickname;

			// are there 1 players now? then set currentPlayer to that player
			if (room.players.length === 1) {
				room.currentPlayer = room.players[0].id;

				const history = room.history || [];
				const newHistory = history.slice(-4);
				const playerName = socket.data.nickname || 'Anonymous';
				generateAIResponse(roomId, room.premise, io, roomManager, newHistory, playerName);
			}

			io.to(roomId).emit('playerJoined', { roomId, nickname });
			io.emit('roomList', roomManager.getRooms());

			// Send chat history to joining user
			const history = await roomManager.getChatHistory(roomId);
			socket.emit('chatHistory', history);
		}
	});

	socket.on('message', async ({ roomId, text }) => {
		const nickname = socket.data.nickname || 'Anonymous';
		const message: Message = {
			sender: socket.id,
			text,
			timestamp: new Date(),
			nickname
		};
		await roomManager.addMessage(roomId, message);
		io.to(roomId).emit('newMessage', message);
	});

	socket.on('makeChoice', async ({ roomId, choice }) => {
		const room = roomManager.getRoom(roomId);
		if (!room || room.currentPlayer !== socket.id) return;

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

		// Generate new response
		await generateAIResponse(roomId, room.premise, io, roomManager, room.history, playerName);
	});

	socket.on("leaveRoom", (roomId: string) => {
		roomManager.leaveRoom(socket.id, roomId);
		socket.leave(roomId);
		io.emit("roomList", roomManager.getRooms());
	});

	socket.on("getRooms", () => {
		socket.emit("roomList", roomManager.getRooms());
	});

	socket.on("getMessages", async (roomId: string) => {
		const socketioRooms = io.sockets.adapter.rooms;
		// const roomNames = Array.from(socketioRooms.keys());
		// console.log("Rooms:", roomNames);
		// const listeners = io.sockets.adapter.rooms.get(roomId);
		// console.log(roomId + " Current listeners:", listeners);
		const messages = await roomManager.getChatHistory(roomId);
		// console.log("Sending chat history:", messages, "for room", roomId);
		socket.to(roomId).emit("chatHistory", messages);
	});

	socket.on("regenerateResponse", async (roomId: string, premise: string) => {
		console.log("Regenerating response for room", roomId, "with premise", premise);
		const room = roomManager.getRoom(roomId);
		if (!room) return;
		const history = room.history || [];
		const newHistory = history.slice(-4);
		const playerName = socket.data.nickname || 'Anonymous';
		await generateAIResponse(roomId, premise, io, roomManager, newHistory, playerName);
	});

	socket.on("disconnect", () => {
		roomManager.removePlayerFromAllRooms(socket.id);
		console.log("A user disconnected", socket.id);
		io.emit("roomList", roomManager.getRooms());
	});

	// this does not seem to work
	const sockets = io.sockets.sockets;
	const socketIds = Array.from(sockets.keys());
	const rooms = roomManager.getRooms();
	const players = rooms.flatMap(room => room.players.map(player => player.id));
	const disconnected = socketIds.filter(id => !players.includes(id));
	disconnected.forEach(id => {
		roomManager.removePlayerFromAllRooms(id);
	});
};
