import { ref } from 'vue';

const log = useLog('useAdminSocket');

class AdminClientManager {
	private static instance: AdminClientManager | null = null;
	private toast = useToast();

	public isValidated = ref(false);
	private password = ref('');

	private constructor() {}

	static getInstance(): AdminClientManager {
		if (!AdminClientManager.instance) {
			AdminClientManager.instance = new AdminClientManager();
		}
		return AdminClientManager.instance;
	}

	private async callAdminApi(action: string, payload?: any): Promise<boolean> {
		try {
			await $fetch('/api/admin/action', {
				method: 'POST',
				body: {
					action,
					password: this.password.value,
					payload
				}
			});
			this.toast.add({ title: 'Success', description: `${action} successful` });
			return true;
		} catch (e: any) {
			log.error({ _ctx: { error: e } }, `Admin action ${action} failed`);
			this.toast.add({ title: 'Error', description: e.message || 'Action failed', color: 'red' });
			return false;
		}
	}

	public async checkPassword(password: string): Promise<void> {
		log.debug('Checking admin password');
		this.password.value = password;
		const success = await this.callAdminApi('checkPassword');
		this.isValidated.value = success;
	}

	public clearRooms(): void {
		if (!this.isValidated.value) return;
		log.debug('Clearing all rooms');
		this.callAdminApi('clearRooms');
	}

	public removeRoom(roomId: string): void {
		if (!this.isValidated.value) return;
		log.debug('Removing room');
		this.callAdminApi('removeRoom', { roomId });
	}

	public removeAllPlayers(): void {
		if (!this.isValidated.value) return;
		log.debug('Removing all players');
		this.callAdminApi('removeAllPlayers');
	}

	public setCurrentPlayer(roomId: string, playerId: string): void {
		if (!this.isValidated.value) return;
		log.debug('Setting current player');
		this.callAdminApi('setCurrentPlayer', { roomId, playerId });
	}

	public kickPlayer(roomId: string, playerId: string): void {
		if (!this.isValidated.value) return;
		log.debug('Kicking player');
		this.callAdminApi('kickPlayer', { roomId, playerId });
	}

	public toggleFastMode(roomId: string): void {
		if (!this.isValidated.value) return;
		log.debug('Toggling fast mode');
		this.callAdminApi('toggleFastMode', { roomId });
	}

	public setGameActive(active: boolean): void {
		if (!this.isValidated.value) return;
		log.debug('Setting game active:', active);
		this.callAdminApi('setGameActive', { active });
	}

	public cleanup(): void {
		// No cleanup needed for API calls
	}
}

export function useAdminSocket() {
	const adminClient = AdminClientManager.getInstance();

	onBeforeUnmount(() => {
		adminClient.cleanup();
	});

	return {
		isValidated: adminClient.isValidated,
		checkPassword: adminClient.checkPassword.bind(adminClient),
		clearRooms: adminClient.clearRooms.bind(adminClient),
		removeRoom: adminClient.removeRoom.bind(adminClient),
		removeAllPlayers: adminClient.removeAllPlayers.bind(adminClient),
		setCurrentPlayer: adminClient.setCurrentPlayer.bind(adminClient),
		kickPlayer: adminClient.kickPlayer.bind(adminClient),
		toggleFastMode: adminClient.toggleFastMode.bind(adminClient),
		setGameActive: adminClient.setGameActive.bind(adminClient),
	};
}
