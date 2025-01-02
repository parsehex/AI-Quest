import { type Socket } from 'socket.io';
import { useRoomManager, type GameRoomManager } from '../GameRoomManager';
import { useLog } from '~/composables/useLog';
import { useIO } from '~/server/plugins/socket.io';

const log = useLog('handlers/admin');

const validateAdminPassword = (password: string): boolean => {
	return password === 'test';
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
			log.info({ _context: { SocketId } }, 'Socket is admin');
			socket.emit('admin:success', { message: 'Password is correct' });
		} else {
			log.warn({ _context: { SocketId }, message: 'Invalid admin password' });
			socket.emit('admin:error', { message: 'Invalid admin password' });
		}
	});

	socket.on('admin:clearRooms', (password: string) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			log.info({ _context: { SocketId } }, 'Clearing all rooms');
			roomManager.clearAllRooms();
			io.emit('roomList', roomManager.getRooms());
			socket.emit('admin:success', { message: 'All rooms cleared' });
		});
	});

	socket.on('admin:removeAllPlayers', (password: string) => {
		adminGuard(password, () => {
			const SocketId = socket.id;
			log.info({ _context: { SocketId } }, 'Removing all players');
			const rooms = roomManager.getRooms();
			rooms.forEach(room => {
				room.players = [];
				room.currentPlayer = undefined;
				room.currentTurn = 0;
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
			log.info({ _context: { SocketId, roomId, TargetPlayer } }, 'Setting current player');
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
			log.info({ _context: { SocketId, roomId, TargetPlayer } }, 'Kicking player');
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
			log.info({ _context: { SocketId, roomId } }, 'Toggling fast mode');
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
};
