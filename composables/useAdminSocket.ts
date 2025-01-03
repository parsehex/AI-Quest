'use client';
import { ref } from 'vue';
import { socket } from '~/lib/socket';

const log = useLog('useAdminSocket');

class AdminSocketManager {
	private static instance: AdminSocketManager | null = null;
	private toast = useToast();

	public isValidated = ref(false);
	private password = ref('');

	private constructor() {
		this.initializeSocketListeners();
	}

	static getInstance(): AdminSocketManager {
		if (!AdminSocketManager.instance) {
			AdminSocketManager.instance = new AdminSocketManager();
		}
		return AdminSocketManager.instance;
	}

	private initializeSocketListeners(): void {
		socket.on('admin:success', this.onAdminSuccess.bind(this));
		socket.on('admin:error', this.onAdminError.bind(this));
	}

	private onAdminSuccess({ message }: { message: string }): void {
		this.toast.add({
			title: 'Success',
			description: message,
		});
		this.isValidated.value = true;
	}

	private onAdminError({ message }: { message: string }): void {
		this.toast.add({
			title: 'Error',
			description: message,
		});
		this.isValidated.value = false;
	}

	public checkPassword(password: string): void {
		log.debug('Checking admin password');
		this.password.value = password;
		socket.emit('admin:checkPassword', password);
	}

	public clearRooms(): void {
		if (!this.isValidated.value) return;
		log.debug('Clearing all rooms');
		socket.emit('admin:clearRooms', this.password.value);
	}

	public removeRoom(roomId: string): void {
		if (!this.isValidated.value) return;
		log.debug('Removing room');
		socket.emit('admin:removeRoom', this.password.value, roomId);
	}

	public removeAllPlayers(): void {
		if (!this.isValidated.value) return;
		log.debug('Removing all players');
		socket.emit('admin:removeAllPlayers', this.password.value);
	}

	public setCurrentPlayer(roomId: string, playerId: string): void {
		if (!this.isValidated.value) return;
		log.debug('Setting current player');
		socket.emit('admin:setCurrentPlayer', this.password.value, roomId, playerId);
	}

	public kickPlayer(roomId: string, playerId: string): void {
		if (!this.isValidated.value) return;
		log.debug('Kicking player');
		socket.emit('admin:kickPlayer', this.password.value, roomId, playerId);
	}

	public toggleFastMode(roomId: string): void {
		if (!this.isValidated.value) return;
		log.debug('Toggling fast mode');
		socket.emit('admin:toggleFastMode', this.password.value, roomId);
	}

	public cleanup(): void {
		socket.off('admin:success');
		socket.off('admin:error');
	}

	public setGameActive(active: boolean): void {
		if (!this.isValidated.value) return;
		log.debug('Setting game active:', active);
		socket.emit('admin:setGameActive', this.password.value, active);
	}
}

export function useAdminSocket() {
	const adminSocket = AdminSocketManager.getInstance();

	onBeforeUnmount(() => {
		adminSocket.cleanup();
	});

	return {
		isValidated: adminSocket.isValidated,
		checkPassword: adminSocket.checkPassword.bind(adminSocket),
		clearRooms: adminSocket.clearRooms.bind(adminSocket),
		removeRoom: adminSocket.removeRoom.bind(adminSocket),
		removeAllPlayers: adminSocket.removeAllPlayers.bind(adminSocket),
		setCurrentPlayer: adminSocket.setCurrentPlayer.bind(adminSocket),
		kickPlayer: adminSocket.kickPlayer.bind(adminSocket),
		toggleFastMode: adminSocket.toggleFastMode.bind(adminSocket),
		setGameActive: adminSocket.setGameActive.bind(adminSocket),
	};
}
