import { type Socket } from 'socket.io';
import { useRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { playChoice, updateRoom } from './choices';
import { useIO } from '~/server/plugins/socket.io';

const log = useLog('handlers/rooms');

export const registerRoomHandlers = (socket: Socket) => {
	const io = useIO();
	const roomManager = useRoomManager();

	socket.on("createRoom", async (roomName: string, premise: string, fastMode: boolean) => {
		const SocketId = socket.id;
		const playerName = socket.data.nickname || 'Anonymous';
		log.debug({ _context: { SocketId, roomName, playerName, premise, fastMode } }, "Creating room");
		const room = await roomManager.createRoom(socket.id, roomName, premise, fastMode, playerName);
		socket.join(room.id);

		// Generate initial turnm
		playChoice(room.id, playerName);
	});

	socket.on('joinRoom', async ({ roomId, nickname, clientId, playerCharacter }) => {
		const room = roomManager.getRoom(roomId);
		if (room) {
			const SocketId = socket.id;
			log.debug({ _context: { SocketId, roomId, nickname, clientId, playerCharacter } }, "Player joined room");
			socket.join(roomId);

			const existingPlayer = room.players.find(p => p.clientId === clientId);
			if (existingPlayer) {
				existingPlayer.id = socket.id;
			} else {
				await roomManager.joinRoom(socket.id, roomId, nickname, clientId, playerCharacter);
			}

			// this might cause issues playing multiple games at once
			socket.data.nickname = nickname;
			socket.data.playerCharacter = playerCharacter;

			// are there 1 players now and not loading? then set currentPlayer to that player and generate their turn
			if (room.players.length === 1 && !room.aiLoading) {
				const CurrentPlayer = room.players[0].id;
				log.debug({ _context: { roomId, CurrentPlayer } }, "Setting current player");
				// TODO maybe just expose this from choices.ts
				updateRoom(roomId, room => {
					room.currentPlayer = room.players[0].id;
					room.history = room.history.slice(-4);
					const playerName = socket.data.nickname || 'Anonymous';
					playChoice(roomId, playerName);
				});
			}

			io.to(roomId).emit('playerJoined', { roomId, nickname });

			// Send chat history to joining user
			const history = await roomManager.getChatHistory(roomId);
			socket.emit('chatHistory', history);
		}
	});

	socket.on("leaveRoom", (roomId: string) => {
		const SocketId = socket.id;
		log.debug({ _context: { SocketId, roomId } }, "Player left room");
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
