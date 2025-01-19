import { type Socket } from 'socket.io';
import { useRoomManager } from '../GameRoomManager';
import { useServerOptions } from '../ServerOptionsManager';
import { useLog } from '~/composables/useLog';
import { useIO } from '~/server/plugins/socket.io';
import { ModelConfig } from '~/types/Game/AI';

const log = useLog('handlers/admin');
const config = useRuntimeConfig();

const validateAdminPassword = (password: string): boolean => {
	return password === config.private.adminPassword;
};

export const registerAdminHandlers = (socket: Socket) => {
	const io = useIO();
	const roomManager = useRoomManager();

	const adminGuard = (password: string, callback: Function) => {
		if (!validateAdminPassword(password)) {
			socket.emit('admin:error', { message: 'Invalid admin password' });
			return;
		}
		callback();
	};

	socket.on('admin:checkPassword', (password: string) => {
		const SocketId = socket.id;
		if (validateAdminPassword(password)) {
			log.info({ _ctx: { SocketId } }, 'Socket is admin');
			socket.emit('admin:success', { message: 'Password is correct' });
		} else {
			log.warn({ _ctx: { SocketId }, message: 'Invalid admin password' });
			socket.emit('admin:error', { message: 'Invalid admin password' });
		}
	});

	socket.on('admin:clearRooms', (password: string) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			log.info({ _ctx: { SocketId } }, 'Clearing all rooms');
			roomManager.clearAllRooms();
			io.emit('roomList', roomManager.getRooms());
			socket.emit('admin:success', { message: 'All rooms cleared' });
		});
	});

	socket.on('admin:removeAllPlayers', (password: string) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			log.info({ _ctx: { SocketId } }, 'Removing all players');
			const rooms = roomManager.getRooms();
			rooms.forEach(room => {
				room.players = [];
				room.currentPlayer = undefined;
				room.currentTurn = -1;
			});
			io.emit('kicked');
			io.emit('roomList', roomManager.getRooms());
			socket.emit('admin:success', { message: 'All players removed' });
		});
	});

	socket.on('admin:setCurrentPlayer', (password: string, roomId: string, playerId: string) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			const TargetPlayer = playerId;
			log.info({ _ctx: { SocketId, roomId, TargetPlayer } }, 'Setting current player');
			const room = roomManager.getRoom(roomId);
			if (room) {
				room.currentPlayer = playerId;
				io.to(roomId).emit('roomList', roomManager.getRooms());
				socket.emit('admin:success', { message: 'Current player set' });
			} else {
				socket.emit('admin:error', { message: 'Room not found' });
			}
		});
	});

	socket.on('admin:kickPlayer', (password: string, roomId: string, playerId: string) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			const TargetPlayer = playerId;
			log.info({ _ctx: { SocketId, roomId, TargetPlayer } }, 'Kicking player');
			const room = roomManager.getRoom(roomId);
			if (room) {
				room.players = room.players.filter(player => player.id !== playerId);
				io.to(playerId).emit('kicked');
				io.to(roomId).emit('roomList', roomManager.getRooms());
				socket.emit('admin:success', { message: 'Player kicked' });
			} else {
				socket.emit('admin:error', { message: 'Room not found' });
			}
		});
	});

	socket.on('admin:toggleFastMode', (password: string, roomId: string) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			log.info({ _ctx: { SocketId, roomId } }, 'Toggling fast mode');
			const room = roomManager.getRoom(roomId);
			if (room) {
				room.fastMode = !room.fastMode;
				io.to(roomId).emit('roomList', roomManager.getRooms());
				socket.emit('admin:success', { message: 'Fast mode toggled' });
			} else {
				socket.emit('admin:error', { message: 'Room not found' });
			}
		});
	});

	socket.on('admin:removeRoom', (password: string, roomId: string) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			log.info({ _ctx: { SocketId, roomId } }, 'Removing room');
			const room = roomManager.getRoom(roomId);
			if (room) {
				roomManager.removeRoom(roomId);
				io.emit('roomList', roomManager.getRooms());
				socket.emit('admin:success', { message: 'Room removed' });
			} else {
				socket.emit('admin:error', { message: 'Room not found' });
			}
		});
	});

	socket.on('admin:setGameActive', (password: string, active: boolean) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			log.info({ _ctx: { SocketId } }, `Setting game active: ${active}`);
			const serverOptions = useServerOptions();
			serverOptions.setGameActive(active);
			io.emit('gameActiveStatus', active);
			if (active) {
				// kick everybody out to force reload, to get all socket handlers
				io.emit('kicked');
			}
			socket.emit('admin:success', { message: `Game ${active ? 'activated' : 'deactivated'}` });
		});
	});

	socket.on('admin:setModelConfig', (password: string, config: ModelConfig) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			log.info({ _ctx: { SocketId } }, 'Updating model configuration');
			const serverOptions = useServerOptions();
			serverOptions.setModelConfig(config)
				.then(() => {
					io.emit('modelConfig', serverOptions.getModelConfig());
					socket.emit('admin:success', { message: 'Model configuration updated' });
				})
				.catch((error) => {
					log.error({ _ctx: { SocketId, error } }, 'Failed to update model configuration');
					socket.emit('admin:error', { message: 'Failed to update model configuration' });
				});
		});
	});
};
