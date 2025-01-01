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

	// admin:checkPassword
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
			io.emit('roomList', roomManager.getRooms());
			socket.emit('admin:success', { message: 'All players removed' });
		});
	});
};
