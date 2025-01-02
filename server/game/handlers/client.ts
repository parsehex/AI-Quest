import { Server, Socket } from 'socket.io';
import type { GameRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';

const log = useLog('game/handlers/client');

export const registerClientHandlers = (io: Server, socket: Socket, roomManager: GameRoomManager) => {
	let clientIdMap = new Map<string, string>();

	socket.on('identify', (clientId: string) => {
		const SocketId = socket.id;
		const nickname = socket.data.nickname || 'Anonymous';
		log.debug({ _context: { SocketId, clientId, nickname } }, 'Identified client');
		clientIdMap.set(clientId, socket.id);
	});

	socket.on('disconnect', () => {
		roomManager.removePlayerFromAllRooms(socket.id);
		const SocketId = socket.id;
		log.debug({ _context: { SocketId } }, 'Socket disconnected');
		io.emit('roomList', roomManager.getRooms());
	});
};
