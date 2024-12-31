import { Server, Socket } from 'socket.io';
import { RoomManager } from './rooms';
import { Message } from '~/types/Game';
import { LLMManager } from '~/lib/llm';

const generateAIResponse = async (roomId: string, premise: string, io: Server, roomManager: RoomManager) => {
	const room = roomManager.getRoom(roomId);
	if (!room) return;

	room.aiLoading = true;
	room.premise = premise;
	io.to(room.id).emit("roomList", roomManager.getRooms());

	const llm = LLMManager.getInstance();
	const response = await llm.generateResponse([
		{ role: "system", content: "You are a creative game master narrating an interactive story." },
		{ role: "user", content: `Premise: ${premise}\n\nProvide an engaging opening scene for this story.` }
	]);

	room.lastAiResponse = response;
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
};
