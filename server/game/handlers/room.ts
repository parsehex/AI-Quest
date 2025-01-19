import { type Socket } from 'socket.io';
import { useRoomManager, updateRoom } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { playChoice } from './choices';
import { useIO } from '~/server/plugins/socket.io';
import { LLMManager } from '~/lib/llm';
import { RemixPremise } from '~/lib/prompts/templates';
import { extractOutput } from '~/lib/utils';
import { STARTER_NAMES, STARTER_PREMISES, CHARACTER_OPTIONS } from '~/lib/constants';

const log = useLog('handlers/rooms');

const validateCharacter = (character: any) => {
	if (!character) return false;
	if (typeof character !== 'object') return false;
	if (Array.isArray(character)) return false;

	if (
		character.class &&
		!CHARACTER_OPTIONS.classes.includes(character.class)
	) return false;
	if (
		character.background &&
		!CHARACTER_OPTIONS.backgrounds.includes(character.background)
	) return false;

	return true;
}

export const registerRoomHandlers = (socket: Socket) => {
	const io = useIO();
	const roomManager = useRoomManager();
	const isDev = process.env.NODE_ENV === 'development';

	socket.on('createRoom', async (premise: string, fastMode: boolean, playerName = '') => {
		const SocketId = socket.id;
		log.debug({ _ctx: { SocketId, playerName, premise, fastMode } }, 'Socket is creating room');

		if (!STARTER_PREMISES.includes(premise) && !isDev) {
			log.warn({ _ctx: { SocketId, premise } }, 'Player tried to use a custom premise');
			socket.emit('toast', 'Invalid Premise', 'You must use a predefined premise');
			return;
		}

		if (!STARTER_NAMES.includes(playerName) && !isDev) {
			log.warn({ _ctx: { SocketId, playerName } }, 'Player tried to use a custom name');
			socket.emit('toast', 'Invalid Name', 'You must use a predefined name');
			return;
		}

		socket.emit('toast', 'Creating room', 'Please wait...');
		const room = await roomManager.createRoom(socket.id, premise, fastMode, playerName);
		socket.join(room.id);

		// Generate initial turn
		// playChoice(room.id, playerName);
	});

	socket.on('joinRoom', async ({ roomId, nickname, clientId, playerCharacter }) => {
		const SocketId = socket.id;
		const room = roomManager.getRoom(roomId);
		if (!room) {
			log.warn({ _ctx: { SocketId, roomId, nickname, clientId, playerCharacter } }, "Room doesn't exist");
			return;
		}

		if (!STARTER_NAMES.includes(nickname) && !isDev) {
			log.warn({ _ctx: { SocketId, nickname } }, 'Player tried to use a custom name');
			socket.emit('toast', 'Invalid Name', 'You must use a predefined name');
			return;
		}

		if (!validateCharacter(playerCharacter) && !isDev) {
			log.warn({ _ctx: { SocketId, roomId, nickname, clientId, playerCharacter } }, 'Player tried to use custom character');
			// socket.emit('toast', 'Invalid Character', 'You can only choose from the predefined character options');
			socket.emit('kicked')
			return;
		}

		log.debug({ _ctx: { SocketId, roomId, nickname, clientId, playerCharacter } }, 'Player joined room');
		socket.join(roomId);

		const existingPlayer = room.players.find(p => p.clientId === clientId);
		if (existingPlayer) {
			log.info({ _ctx: { SocketId, roomId, clientId } }, 'Re-attaching player');
			existingPlayer.id = socket.id;
		} else {
			log.info({ _ctx: { SocketId, roomId, nickname, clientId, playerCharacter } }, 'Joined player');

			// check player character
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
		], RemixPremise.info.fast, { roomId }, RemixPremise.llmOptions);
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
