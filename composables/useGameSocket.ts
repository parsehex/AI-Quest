'use client';
import type { ChatMessage, PlayerCharacter, Room } from '~/types/Game'
import { socket } from '~/lib/socket'
import { ref, computed } from 'vue'

const log = useLog('useGameSocket');

export function getClientId(): string {
	let clientId = localStorage.getItem('clientId')
	if (!clientId) {
		clientId = `client_${Math.random().toString(36).substring(2)}`
		localStorage.setItem('clientId', clientId)
	}
	return clientId
}

export function getPlayerCharacter(): PlayerCharacter {
	let playerCharacter = localStorage.getItem('playerCharacter')
	if (!playerCharacter) {
		const obj: PlayerCharacter = {
			class: '',
			race: '',
			background: '',
			traits: [],
			skills: [],
			equipment: []
		};
		localStorage.setItem('playerCharacter', JSON.stringify(obj));
	}
	return JSON.parse(playerCharacter || '{}');
}

class GameSocketManager {
	private static instance: GameSocketManager | null = null;
	private refreshInterval: NodeJS.Timeout | null = null;

	public toast = useToast();
	public isConnected = ref(false);
	public transport = ref('N/A');
	public clientId = ref(undefined as string | undefined);
	public rooms = ref<Room[]>([]);
	public currentRoom = ref<string | null>(null);
	public thisRoom = computed(() => this.rooms.value.find(room => room.id === this.currentRoom.value));
	public error = ref(null);
	public messages = ref<ChatMessage[]>([]);
	public hasRooms = computed(() => this.rooms.value.length > 0);

	private constructor() {
		this.initializeSocketListeners();
		if (socket.connected) {
			this.onConnect();
			log.debug({ _ctx: { socketId: socket.id } }, 'Already connected');
		}
	}

	static getInstance(): GameSocketManager {
		if (!GameSocketManager.instance) {
			GameSocketManager.instance = new GameSocketManager();
		}
		return GameSocketManager.instance;
	}

	public reinitializeListeners(): void {
		this.cleanup();
		this.initializeSocketListeners();
	}

	private initializeSocketListeners(): void {
		socket.on('connect', this.onConnect.bind(this));
		socket.on('disconnect', this.onDisconnect.bind(this));
		socket.on('roomList', this.onRoomList.bind(this));
		socket.on('playerJoined', this.onPlayerJoined.bind(this));
		socket.on('chatHistory', this.onChatHistory.bind(this));
		socket.on('newMessage', this.onNewMessage.bind(this));
		socket.on('kicked', this.onKicked.bind(this));
		socket.on('toast', this.onToast.bind(this));
	}

	private onConnect(): void {
		this.isConnected.value = true;
		this.transport.value = socket.io.engine.transport.name;

		this.clientId.value = getClientId();
		socket.emit('identify', this.clientId.value);

		socket.io.engine.on("upgrade", (rawTransport) => {
			this.transport.value = rawTransport.name;
		});

		socket.emit('getRooms');

		this.refreshInterval = setInterval(() => {
			this.refreshRooms();
			if (this.currentRoom.value) {
				this.refreshMessages();
			}
		}, 5000);
	}

	private onDisconnect(): void {
		this.isConnected.value = false;
		this.transport.value = 'N/A';
	}

	private onRoomList(updatedRooms: Room[]): void {
		// log.debug('Received room list:', updatedRooms);
		log.debug({ _ctx: { updatedRooms } }, 'Received room list');
		this.rooms.value = [...updatedRooms];
	}

	private onPlayerJoined(playerId: string): void {
		log.debug({ _ctx: { playerId } }, 'Player joined');
	}

	private onChatHistory(history: ChatMessage[]): void {
		log.debug({ _ctx: { history } }, 'Received chat history');
		this.messages.value = [...history];
	}

	private onNewMessage(message: ChatMessage): void {
		log.debug({ _ctx: { message } }, 'Received new message');
		this.messages.value = [...this.messages.value, message];
	}

	private onToast({ message, color }: { message: string, color?: string }): void {
		this.toast.add({
			description: message,
			color,
			timeout: 5000
		});
	}

	private onKicked(): void {
		// @ts-ignore
		window.location.href = '/';
	}

	public cleanup(): void {
		socket.off('connect');
		socket.off('disconnect');
		socket.off('roomList');
		socket.off('playerJoined');
		socket.off('chatHistory');
		socket.off('newMessage');
		socket.off('kicked');
		socket.off('toast');
	}

	// Public methods
	public createRoom(roomName: string, premise: string, fastMode = false): void {
		log.debug({ _ctx: { roomName, premise, fastMode } }, 'Creating room');
		socket.emit('createRoom', roomName, premise, fastMode);
	}

	public joinRoom(roomId: string, isSpectator = false): void {
		const nickname = localStorage.getItem('nickname') || 'Anonymous';
		const clientId = getClientId();
		const playerCharacter = getPlayerCharacter();
		log.debug({ _ctx: { roomId, clientId, nickname, playerCharacter } }, 'Joined room:');
		socket.emit('joinRoom', { roomId, nickname, clientId, playerCharacter, isSpectator });
		this.currentRoom.value = roomId;
		this.refreshMessages(roomId);
	}

	public leaveRoom(): void {
		log.debug({ _ctx: { roomId: this.currentRoom.value } }, 'Leaving room');
		socket.emit('leaveRoom', this.currentRoom.value);
		this.currentRoom.value = null;
	}

	public sendMessage(roomId: string, text: string): void {
		log.debug({ _ctx: { roomId, text } }, 'Sending message');
		socket.emit('message', { roomId, text });
	}

	public refreshRooms(): void {
		socket.emit('getRooms');
	}
	public refreshMessages(roomId = ''): void {
		if (roomId === '') {
			roomId = this.currentRoom.value || '';
		}
		if (roomId === '') return;
		socket.emit('getMessages', roomId);
	}

	public regenerateResponse(roomId: string): void {
		log.debug({ _ctx: { roomId } }, 'Regenerating response');
		socket.emit('regenerateResponse', roomId);
	}

	public async waitConnected(): Promise<void> {
		if (this.isConnected.value) {
			return;
		}

		return new Promise((resolve) => {
			const onConnect = () => {
				socket.off('connect', onConnect);
				resolve();
			};
			socket.on('connect', onConnect);
		});
	}

	public makeChoice(roomId: string, choice: string): void {
		log.debug({ _ctx: { roomId, choice } }, 'Making choice');
		socket.emit('makeChoice', { roomId, choice });
	}

	public requestTurn(roomId: string): void {
		log.debug({ _ctx: { roomId } }, 'Requesting turn');
		socket.emit('requestTurn', roomId);
	}
}

// Composable
export function useGameSocket() {
	const gameSocket = GameSocketManager.getInstance();

	onBeforeUnmount(() => {
		gameSocket.cleanup();
	});

	return {
		clientId: gameSocket.clientId,
		isConnected: gameSocket.isConnected,
		transport: gameSocket.transport,
		rooms: gameSocket.rooms,
		currentRoom: gameSocket.currentRoom,
		thisRoom: gameSocket.thisRoom,
		error: gameSocket.error,
		messages: gameSocket.messages,
		hasRooms: gameSocket.hasRooms,

		reinitializeListeners: gameSocket.reinitializeListeners.bind(gameSocket),
		refreshRooms: gameSocket.refreshRooms.bind(gameSocket),
		refreshMessages: gameSocket.refreshMessages.bind(gameSocket),
		regenerateResponse: gameSocket.regenerateResponse.bind(gameSocket),
		createRoom: gameSocket.createRoom.bind(gameSocket),
		joinRoom: gameSocket.joinRoom.bind(gameSocket),
		leaveRoom: gameSocket.leaveRoom.bind(gameSocket),
		sendMessage: gameSocket.sendMessage.bind(gameSocket),
		waitConnected: gameSocket.waitConnected.bind(gameSocket),
		makeChoice: gameSocket.makeChoice.bind(gameSocket),
		requestTurn: gameSocket.requestTurn.bind(gameSocket),
	}
}
