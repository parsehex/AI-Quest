import { Server, Socket } from 'socket.io';
import type { GameRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { playChoice } from './choices';

const log = useLog('handlers/rooms');

export const registerRoomHandlers = (io: Server, socket: Socket, roomManager: GameRoomManager) => {
	socket.on("createRoom", async (roomName: string, premise: string, fastMode: boolean) => {
		log.debug("Socket", socket.id, "creating room", roomName, "with fast mode", fastMode);
		const playerName = socket.data.nickname || 'Anonymous';
		const room = await roomManager.createRoom(socket.id, roomName, premise, fastMode, playerName);
		socket.join(room.id);

		// Generate initial turnm
		await playChoice(io, roomManager, room.id, playerName);
	});

	socket.on('joinRoom', async ({ roomId, nickname, clientId }) => {
		const room = roomManager.getRoom(roomId);
		if (room) {
			log.debug("Socket", socket.id, "joining room", roomId, "as", nickname, "with clientId", clientId);
			socket.join(roomId);

			const existingPlayer = room.players.find(p => p.clientId === clientId);
			if (existingPlayer) {
				existingPlayer.id = socket.id;
			} else {
				await roomManager.joinRoom(socket.id, roomId, nickname, clientId);
			}

			// this might cause issues playing multiple games at once
			socket.data.nickname = nickname;

			// are there 1 players now? then set currentPlayer to that player and generate their turn
			if (room.players.length === 1) {
				log.debug("Setting current player to", room.players[0].id, "and generating AI response");
				room.currentPlayer = room.players[0].id;
				room.history = room.history.slice(-4);
				const playerName = socket.data.nickname || 'Anonymous';
				playChoice(io, roomManager, roomId, playerName);
			}

			io.to(roomId).emit('playerJoined', { roomId, nickname });
			io.to(roomId).emit('roomList', roomManager.getRooms());

			// Send chat history to joining user
			const history = await roomManager.getChatHistory(roomId);
			socket.emit('chatHistory', history);
		}
	});

	socket.on("leaveRoom", (roomId: string) => {
		log.debug("Socket ", socket.id, "leaving room", roomId);
		roomManager.leaveRoom(socket.id, roomId);
		socket.leave(roomId);
		io.emit("roomList", roomManager.getRooms());
	});

	socket.on("getRooms", () => {
		socket.emit("roomList", roomManager.getRooms());
	});

	// Clear players
	// const rooms = roomManager.getRooms();
	// const players = rooms.flatMap(room => room.players.map(player => player.id));
	// players.forEach(id => {
	// 	roomManager.removePlayerFromAllRooms(id);
	// });
};
