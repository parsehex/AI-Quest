import type { AILoadingState, ChatMessage, PlayerCharacter, Room } from '~/types/Game'
import { ref, computed } from 'vue'
import type { Database } from '~/types/database.types'

const log = useLog('useGameClient');

export function getClientId(): string {
	const user = useSupabaseUser();
	let clientId: string | undefined = user.value?.id;
	if (!clientId) {
		return '';
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

class GameClientManager {
	private static instance: GameClientManager | null = null;

	public aiLoading = ref(undefined as AILoadingState | undefined);
	public toast = useToast();
	public isConnected = ref(false);
	public transport = ref('Supabase Realtime');
	public clientId = ref(undefined as string | undefined);
	public rooms = ref<Room[]>([]);
	public currentRoom = ref<string | null>(null);
	public thisRoom = computed(() => this.rooms.value.find(room => room.id === this.currentRoom.value));
	public error = ref(null);
	public messages = ref<ChatMessage[]>([]);
	public hasRooms = computed(() => this.rooms.value.length > 0);

	private supabase = useSupabaseClient<Database>();
	private channel: ReturnType<typeof this.supabase.channel> | null = null;

	private constructor() {
		this.initializeListeners();
	}

	static getInstance(): GameClientManager {
		if (!GameClientManager.instance) {
			GameClientManager.instance = new GameClientManager();
		}
		return GameClientManager.instance;
	}

	public reinitializeListeners(): void {
		this.cleanup();
		this.initializeListeners();
	}

	private initializeListeners(): void {
		this.clientId.value = getClientId();
		this.isConnected.value = true; // Always "connected" with Supabase

		// Subscribe to rooms changes
		this.supabase
			.channel('public:rooms')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, (payload) => {
				log.debug({ _ctx: { payload } }, 'Room update received');
				this.refreshRooms();
			})
			.subscribe();

		this.refreshRooms();

		// Handle tab close
		if (import.meta.client) {
			window.addEventListener('beforeunload', () => {
				this.leaveRoom();
			});
		}
	}

	public cleanup(): void {
		if (this.currentRoom.value) {
			this.leaveRoom();
		}
		if (this.channel) {
			this.supabase.removeChannel(this.channel);
			this.channel = null;
		}
		this.supabase.removeAllChannels();

		// Remove listener?
		// It's on window, so it persists. But if we unmount the app/component using this, we might want to remove it.
		// But this is a singleton... so it lives as long as the app.
	}

	public async joinRoom(roomId: string, isSpectator = false, characterId?: string): Promise<void> {
		const clientId = getClientId();

		log.debug({ _ctx: { roomId, clientId, characterId } }, 'Joining room');

		// Join logic is now handled by Supabase RLS and presence/insertions
		// We just need to subscribe to the room's channel

		if (this.channel) {
			this.supabase.removeChannel(this.channel);
		}

		this.currentRoom.value = roomId;
		this.refreshMessages(roomId);

		this.channel = this.supabase.channel(`room:${roomId}`)
			.on('postgres_changes', {
				event: 'INSERT',
				schema: 'public',
				table: 'chat_messages',
				filter: `room_id=eq.${roomId}`
			}, (payload) => {
				const newMessage = payload.new as any; // Cast to match ChatMessage
				// Fetch sender info if needed or just push
				// For now, we might need to fetch the full message with sender nickname
				// Or we can just refresh messages. Optimally, we'd have the nickname in the payload or fetch it.
				this.refreshMessages(roomId);
			})
			.on('postgres_changes', {
				event: 'UPDATE',
				schema: 'public',
				table: 'rooms',
				filter: `id=eq.${roomId}`
			}, (payload) => {
				const updatedRoom = payload.new as any;
				// Handle AI loading state or turn changes
				if (updatedRoom.last_ai_response) {
					// Update local state if needed
				}
				this.refreshRooms();
			})
			.subscribe((status) => {
				if (status === 'SUBSCRIBED') {
					log.debug({ _ctx: { roomId } }, 'Subscribed to room channel');
				}
			});

		// Add player to room_players table
		const user = useSupabaseUser();
		if (user.value && !isSpectator) {
			try {
				// Check if already joined
				const { data: existingPlayer } = await this.supabase
					.from('room_players')
					.select('user_id') // Select a field that exists
					.eq('room_id', roomId)
					.eq('user_id', user.value.id)
					.single();

				if (!existingPlayer) {
					// Insert new player
					const { error: insertError } = await this.supabase
						.from('room_players')
						.insert({
							room_id: roomId,
							user_id: user.value.id,
							client_id: clientId, // client_id is required by schema
							character_id: characterId || null
						});

					if (insertError) {
						log.error({ _ctx: { error: insertError } }, 'Failed to join room');
						this.toast.add({ title: 'Error', description: 'Failed to join room', color: 'red' });
					} else {
						log.debug({ _ctx: { roomId } }, 'Joined room successfully');
					}
				} else if (existingPlayer) {
					// Update character if needed
					if (characterId) {
						const { error: updateError } = await this.supabase
							.from('room_players')
							.update({ character_id: characterId })
							.eq('room_id', roomId)
							.eq('user_id', user.value.id);

						if (updateError) {
							log.error({ _ctx: { error: updateError } }, 'Failed to update character in room');
						}
					}
				}
			} catch (e) {
				log.error({ _ctx: { error: e } }, 'Error joining room');
			}
		}
	}



	public leaveRoom(): void {
		const roomId = this.currentRoom.value;
		if (!roomId) return;

		log.debug({ _ctx: { roomId } }, 'Leaving room');

		// Remove from DB using API with keepalive
		// This ensures the request completes even if the tab closes
		$fetch('/api/game/leave', {
			method: 'POST',
			body: { roomId },
			// @ts-ignore - keepalive is supported by native fetch which $fetch uses
			keepalive: true
		}).catch(e => log.error({ _ctx: { error: e } }, 'Failed to leave room'));

		if (this.channel) {
			this.supabase.removeChannel(this.channel);
			this.channel = null;
		}
		this.currentRoom.value = null;
	}

	public async sendMessage(roomId: string, text: string): Promise<void> {
		log.debug({ _ctx: { roomId, text } }, 'Sending message');
		try {
			await $fetch('/api/game/chat', {
				method: 'POST',
				body: { roomId, text }
			});
		} catch (e) {
			log.error({ _ctx: { error: e } }, 'Failed to send message');
			this.toast.add({ title: 'Error', description: 'Failed to send message', color: 'red' });
		}
	}

	public async refreshRooms(): Promise<void> {
		const { data } = await this.supabase.from('rooms').select('*');
		if (data) {
			// We need to map DB shape to Room shape
			// This might require fetching players too
			// For list view, maybe we don't need full details
			this.rooms.value = data.map(r => ({
				...r,
				players: [], // Populate if needed
				history: []
			})) as any;
		}
	}

	public async refreshMessages(roomId = ''): Promise<void> {
		if (roomId === '') {
			roomId = this.currentRoom.value || '';
		}
		if (roomId === '') return;

		const { data } = await this.supabase
			.from('chat_messages')
			.select('*, sender:profiles(id, discord_username)') // Assuming profiles has username
			.eq('room_id', roomId)
			.order('created_at', { ascending: true });

		if (data) {
			this.messages.value = data.map((m: any) => ({
				sender: m.sender_id,
				text: m.text,
				timestamp: new Date(m.created_at),
				nickname: m.sender?.discord_username || 'Anonymous' // Adjust based on actual profile schema
			}));
		}
	}

	public regenerateResponse(roomId: string): void {
		log.debug({ _ctx: { roomId } }, 'Regenerating response');
		// Call action endpoint with empty choice? Or specific flag?
		this.makeChoice(roomId, '');
	}

	public async waitConnected(): Promise<void> {
		// Always connected
		return Promise.resolve();
	}

	public async makeChoice(roomId: string, choice: string): Promise<void> {
		log.debug({ _ctx: { roomId, choice } }, 'Making choice');
		try {
			await $fetch('/api/game/action', {
				method: 'POST',
				body: { roomId, choice }
			});
		} catch (e) {
			log.error({ _ctx: { error: e } }, 'Failed to make choice');
			this.toast.add({ title: 'Error', description: 'Failed to make choice', color: 'red' });
		}
	}

	public requestTurn(roomId: string): void {
		log.debug({ _ctx: { roomId } }, 'Requesting turn');
		// Logic to request turn? Maybe just makeChoice with empty string?
		this.makeChoice(roomId, '');
	}
}

// Composable
export function useGameSocket() {
	const gameClient = GameClientManager.getInstance();

	onBeforeUnmount(() => {
		gameClient.cleanup();
	});

	return {
		aiLoading: gameClient.aiLoading,

		clientId: gameClient.clientId,
		isConnected: gameClient.isConnected,
		transport: gameClient.transport,
		rooms: gameClient.rooms,
		currentRoom: gameClient.currentRoom,
		thisRoom: gameClient.thisRoom,
		error: gameClient.error,
		messages: gameClient.messages,
		hasRooms: gameClient.hasRooms,

		reinitializeListeners: gameClient.reinitializeListeners.bind(gameClient),
		refreshRooms: gameClient.refreshRooms.bind(gameClient),
		refreshMessages: gameClient.refreshMessages.bind(gameClient),
		regenerateResponse: gameClient.regenerateResponse.bind(gameClient),
		joinRoom: gameClient.joinRoom.bind(gameClient),
		leaveRoom: gameClient.leaveRoom.bind(gameClient),
		sendMessage: gameClient.sendMessage.bind(gameClient),
		waitConnected: gameClient.waitConnected.bind(gameClient),
		makeChoice: gameClient.makeChoice.bind(gameClient),
		requestTurn: gameClient.requestTurn.bind(gameClient),
	}
}
