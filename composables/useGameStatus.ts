'use client';
import { ref } from 'vue';
import { socket } from '~/lib/socket';

const log = useLog('useGameStatus');

class GameStatusManager {
	private static instance: GameStatusManager | null = null;
	public isActive = ref(true);

	private constructor() {
		this.initializeSocketListeners();
	}

	static getInstance(): GameStatusManager {
		if (!GameStatusManager.instance) {
			GameStatusManager.instance = new GameStatusManager();
		}
		return GameStatusManager.instance;
	}

	private initializeSocketListeners(): void {
		socket.on('gameActiveStatus', this.onGameActive.bind(this));
	}

	private onGameActive(active: boolean): void {
		this.isActive.value = active;
	}

	public refreshGameActive(): void {
		socket.emit('getGameActive');
	}

	public cleanup(): void {
		socket.off('gameActiveStatus', this.onGameActive);
	}
}

export function useGameStatus() {
	const gameStatus = GameStatusManager.getInstance();

	onBeforeUnmount(() => {
		gameStatus.cleanup();
	});

	return {
		isActive: gameStatus.isActive,
		refreshGameActive: gameStatus.refreshGameActive.bind(gameStatus),
	};
}
