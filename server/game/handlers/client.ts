import { type Socket } from 'socket.io';
import { useRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { useIO } from '~/server/plugins/socket.io';
import { useServerOptions } from '../ServerOptionsManager';

const log = useLog('handlers/client');

export const registerClientHandlers = (socket: Socket) => {
	const io = useIO();
	let clientIdMap = new Map<string, string>();

	socket.on('identify', (clientId: string) => {
		const SocketId = socket.id;
		const nickname = socket.data.nickname || 'Anonymous';
		log.debug({ _ctx: { SocketId, clientId, nickname } }, 'Identified client');
		clientIdMap.set(clientId, socket.id);
	});

	socket.on('disconnect', () => {
		const roomManager = useRoomManager();
		roomManager.removePlayerFromAllRooms(socket.id);
		const SocketId = socket.id;
		log.debug({ _ctx: { SocketId } }, 'Socket disconnected');
		io.emit('roomList', roomManager.getRooms());
	});

	socket.on('getGameActive', () => {
		const serverOptions = useServerOptions();
		socket.emit('gameActiveStatus', serverOptions.isGameActive());
	});
};
