import { Server, Socket } from 'socket.io';
import { RoomManager } from './rooms';
import { Message } from '~/types/Game';
import { LLMManager } from '~/lib/llm';

const generateAIResponse = async (roomId: string, premise: string, io: Server, roomManager: RoomManager, history: string[] = []) => {
	const room = roomManager.getRoom(roomId);
	if (!room) return;

	room.aiLoading = true;
	io.to(room.id).emit("roomList", roomManager.getRooms());

	const llm = LLMManager.getInstance();
	const prompt = `You are a creative game master narrating an interactive story.
Format your response with the following sections:
<intro>A brief one-line intro of the current situation</intro>
<narrative>Detailed description of what happens</narrative>
<choices>
1. [First choice the player can make]
2. [Second choice]
3. [Third choice]
</choices>

Premise: ${premise}
${history.length ? 'Previous events:\n' + history.join('\n') : ''}

Provide the next scene:`;

	const response = await llm.generateResponse([
		{ role: "system", content: "You are a creative game master narrating an interactive story." },
		{ role: "user", content: prompt }
	]);

	// Parse sections
	const sections = {
		intro: response.match(/<intro>(.*?)<\/intro>/s)?.[1] || '',
		narrative: response.match(/<narrative>(.*?)<\/narrative>/s)?.[1] || '',
		choices: response.match(/<choices>(.*?)<\/choices>/s)?.[1].trim().split('\n') || []
	};

	room.lastAiResponse = sections;
	room.currentPlayer = room.players[room.currentTurn || 0]?.id;
	room.aiLoading = false;
	io.to(room.id).emit("roomList", roomManager.getRooms());
};

export const registerRoomHandlers = (io: Server, socket: Socket, roomManager: RoomManager) => {
	socket.on("createRoom", async (roomName: string, premise: string) => {
		const room = await roomManager.createRoom(socket.id, roomName, premise);
		socket.join(room.id);

		// Generate initial AI response
		await generateAIResponse(room.id, premise, io, roomManager);
	});

	// Add to existing handlers
	socket.on('joinRoom', async ({ roomId, nickname }) => {
		const room = await roomManager.joinRoom(socket.id, roomId, nickname);
		if (room) {
			socket.join(roomId);

			// this might cause issues playing multiple games at once
			socket.data.nickname = nickname;

			// are there 1 players now? then set currentPlayer to that player
			if (room.players.length === 1) {
				room.currentPlayer = room.players[0].id;
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
		room.history.push(room.lastAiResponse?.intro || '');
		room.history.push(room.lastAiResponse?.narrative || '');
		choice = choice.replace(/- |#./g, '');
		room.history.push(`${socket.data.nickname} chose: ${choice}`);

		// Move to next player
		room.currentTurn = ((room.currentTurn || 0) + 1) % room.players.length;

		// Generate new response
		await generateAIResponse(roomId, room.premise, io, roomManager, room.history);
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
		const roomNames = Array.from(socketioRooms.keys());
		console.log("Rooms:", roomNames);
		const listeners = io.sockets.adapter.rooms.get(roomId);
		console.log(roomId + " Current listeners:", listeners);
		const messages = await roomManager.getChatHistory(roomId);
		console.log("Sending chat history:", messages, "for room", roomId);
		socket.to(roomId).emit("chatHistory", messages);
	});

	socket.on("regenerateResponse", async (roomId: string, premise: string) => {
		await generateAIResponse(roomId, premise, io, roomManager);
	});

	socket.on("disconnect", () => {
		roomManager.removePlayerFromAllRooms(socket.id);
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
