import { Server, Socket } from 'socket.io';
import { RoomManager } from './rooms';
import { Message } from '~/types/Game';

export const registerRoomHandlers = (io: Server, socket: Socket, roomManager: RoomManager) => {
	socket.on("createRoom", async (roomName: string) => {
		const room = await roomManager.createRoom(socket.id, roomName);
		socket.join(room.id);
		io.emit("roomList", roomManager.getRooms());
	});

	// Add to existing handlers
	socket.on('joinRoom', async ({ roomId, nickname }) => {
		const room = await roomManager.joinRoom(socket.id, roomId, nickname)
		if (room) {
			socket.join(roomId)

			// this might cause issues playing multiple games at once
			socket.data.nickname = nickname

			io.to(roomId).emit('playerJoined', { roomId, nickname })
			io.emit('roomList', roomManager.getRooms())

			// Send chat history to joining user
			const history = await roomManager.getChatHistory(roomId)
			socket.emit('chatHistory', history)
		}
	})

	socket.on('message', async ({ roomId, text }) => {
		const nickname = socket.data.nickname || 'Anonymous'
		const message: Message = {
			sender: socket.id,
			text,
			timestamp: new Date(),
			nickname
		}
		await roomManager.addMessage(roomId, message)
		io.to(roomId).emit('newMessage', message)
	})

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

	socket.on("disconnect", () => {
		roomManager.removePlayerFromAllRooms(socket.id);
		io.emit("roomList", roomManager.getRooms());
	});
};
