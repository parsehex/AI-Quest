import { type Socket } from 'socket.io';
import { useRoomManager, updateRoom } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { playChoice } from './choices';
import { useIO } from '~/server/plugins/socket.io';
import { LLMManager } from '~/lib/llm';
import { RemixPremise } from '~/lib/prompts/templates';
import { extractOutput } from '~/lib/utils';

const log = useLog('handlers/rooms');

export const registerRoomHandlers = (socket: Socket) => {
	const io = useIO();
	const roomManager = useRoomManager();

	socket.on('createRoom', async (premise: string, fastMode: boolean, playerName = '') => {
		const SocketId = socket.id;
		log.debug({ _ctx: { SocketId, playerName, premise, fastMode } }, 'Socket is creating room');

		const room = await roomManager.createRoom(socket.id, premise, fastMode, playerName);
		socket.join(room.id);

		// Generate initial turn
		// playChoice(room.id, playerName);
	});

	socket.on('joinRoom', async ({ roomId, nickname, clientId, playerCharacter }) => {
		const room = roomManager.getRoom(roomId);
		if (room) {
			const SocketId = socket.id;
			log.debug({ _ctx: { SocketId, roomId, nickname, clientId, playerCharacter } }, 'Player joined room');
			socket.join(roomId);

			const existingPlayer = room.players.find(p => p.clientId === clientId);
			if (existingPlayer) {
				log.info({ _ctx: { SocketId, roomId, clientId } }, 'Re-attaching player');
				existingPlayer.id = socket.id;
			} else {
				log.info({ _ctx: { SocketId, roomId, nickname, clientId, playerCharacter } }, 'Joined player');
				await roomManager.joinRoom(socket.id, roomId, nickname, clientId, playerCharacter);
			}

			// this might cause issues playing multiple games at once
			socket.data.nickname = nickname;
			socket.data.playerCharacter = playerCharacter;

			// TODO since player ids still get reset, this doesnt work well
			// are there 1 players now and not loading? then set currentPlayer to that player and generate their turn
			if (room.players.length === 1 && !room.aiLoading) {
				// TODO maybe just expose this from choices.ts
				updateRoom(roomId, room => {
					const CurrentPlayerId = room.players[0].id;
					log.info({ _ctx: { roomId, CurrentPlayerId } }, "Setting current player");
					room.currentPlayer = CurrentPlayerId;
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

	socket.on('leaveRoom', (roomId: string) => {
		const SocketId = socket.id;
		log.debug({ _ctx: { SocketId, roomId } }, 'Player left room');
		roomManager.leaveRoom(socket.id, roomId);
		socket.leave(roomId);
		io.emit('roomList', roomManager.getRooms());
	});

	socket.on('remixPremise', async ({ roomId, premise, playerName }) => {
		console.log('remixPremise', { roomId, premise, playerName });
		const llm = LLMManager.getInstance();
		let response = await llm.generateResponse([
			{ role: 'system', content: RemixPremise.System({}) },
			{
				role: 'user', content: RemixPremise.User({
					premise,
					playerName,
				}),
			}
		], true, { roomId });
		response = extractOutput(response);
		socket.emit('remixResponse', response);
	});

	socket.on('getRooms', () => {
		socket.emit('roomList', roomManager.getRooms());
	});

	// Clear players
	// const rooms = roomManager.getRooms();
	// const players = rooms.flatMap(room => room.players.map(player => player.id));
	// players.forEach(id => {
	// 	roomManager.removePlayerFromAllRooms(id);
	// });
};
