import { Server, Socket } from 'socket.io';
import type { GameRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';

const log = useLog('game/handlers/client');

export const registerClientHandlers = (io: Server, socket: Socket, roomManager: GameRoomManager) => {
	let clientIdMap = new Map<string, string>();

	socket.on('identify', (clientId: string) => {
		log.debug('Identified client:', clientId, 'with socket:', socket.id);
		clientIdMap.set(clientId, socket.id);
	});

	socket.on("disconnect", () => {
		roomManager.removePlayerFromAllRooms(socket.id);
		log.debug("A user disconnected. Socket id:", socket.id);
		io.emit("roomList", roomManager.getRooms());
	});
};
