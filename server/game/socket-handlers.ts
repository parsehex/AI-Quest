import { Server, Socket } from 'socket.io';
import { RoomManager } from './rooms';

export const registerRoomHandlers = (io: Server, socket: Socket, roomManager: RoomManager) => {
	socket.on("createRoom", async (roomName: string) => {
		const room = await roomManager.createRoom(socket.id, roomName);
		socket.join(room.id);
		io.emit("roomList", roomManager.getRooms());
	});

	socket.on("joinRoom", async (roomId: string) => {
		const room = await roomManager.joinRoom(socket.id, roomId);
		if (room) {
			socket.join(roomId);
			io.to(roomId).emit("playerJoined", socket.id);
			io.emit("roomList", roomManager.getRooms());
		}
	});

	socket.on("leaveRoom", (roomId: string) => {
		roomManager.leaveRoom(socket.id, roomId);
		socket.leave(roomId);
		io.emit("roomList", roomManager.getRooms());
	});

	socket.on("getRooms", () => {
		socket.emit("roomList", roomManager.getRooms());
	});

	socket.on("disconnect", () => {
		roomManager.removePlayerFromAllRooms(socket.id);
		io.emit("roomList", roomManager.getRooms());
	});
};
