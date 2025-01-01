import { Server, Socket } from 'socket.io';
import { RoomManager } from './rooms';

const validateAdminPassword = (password: string): boolean => {
	return password === 'test';
};

export const registerAdminHandlers = (io: Server, socket: Socket, roomManager: RoomManager) => {
	const adminGuard = (password: string, callback: Function) => {
		if (!validateAdminPassword(password)) {
			socket.emit('admin:error', { message: 'Invalid admin password' });
			return;
		}
		callback();
	};

	socket.on('admin:checkPassword', (password: string) => {
		if (validateAdminPassword(password)) {
			socket.emit('admin:success', { message: 'Password is correct' });
		} else {
			socket.emit('admin:error', { message: 'Invalid admin password' });
		}
	});

	socket.on('admin:clearRooms', (password: string) => {
		adminGuard(password, () => {
			roomManager.clearAllRooms();
			io.emit('roomList', roomManager.getRooms());
			io.emit('kicked');
			socket.emit('admin:success', { message: 'All rooms cleared' });
		});
	});

	socket.on('admin:removeAllPlayers', (password: string) => {
		adminGuard(password, () => {
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
			const room = roomManager.getRoom(roomId);
			if (room) {
				room.players = room.players.filter(player => player.id !== playerId);
				io.to(roomId).emit('roomList', roomManager.getRooms());
				io.to(playerId).emit('kicked');
				socket.emit('admin:success', { message: 'Player kicked' });
			} else {
				socket.emit('admin:error', { message: 'Room not found' });
			}
		});
	});

	socket.on('admin:toggleFastMode', (password: string, roomId: string) => {
		adminGuard(password, () => {
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
