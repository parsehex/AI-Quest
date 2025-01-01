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

	public removeAllPlayers(): void {
		if (!this.isValidated.value) return;
		log.debug('Removing all players');
		socket.emit('admin:removeAllPlayers', this.password.value);
	}

	public cleanup(): void {
		socket.off('admin:success');
		socket.off('admin:error');
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
		removeAllPlayers: adminSocket.removeAllPlayers.bind(adminSocket),
	};
}
