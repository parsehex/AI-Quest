import { v4 as uuidv4, validate as validateUUID } from 'uuid';
import { ChatMessage, GameHistoryItem, LastAIResponse, PlayerCharacter, Room } from '~/types/Game';
import { useLog } from '~/composables/useLog';
import { getServiceClient } from '../utils/supabase'
import { Tables } from '~/types/database.types';

const log = useLog('GameRoomManager');

let roomManagerInstance: GameRoomManager | null = null;

export interface Player {
	id: string
	clientId: string
	nickname: string
	character?: Tables<'player_characters'>
	isSpectator: boolean
}

export interface GameRoom extends Tables<'rooms'> {
	players: Player[]
	name: string
	premise: string
	current_turn: number
	current_player: string | null
	fast_mode: boolean
	created_by: string
	history: GameHistoryItem[]
	last_ai_response?: LastAIResponse
}

interface RoomUpdate {
	last_ai_response?: LastAIResponse;
	current_player?: string | null;
	current_turn?: number;
	players?: Player[];
	history?: GameHistoryItem[];
}

export function useRoomManager(): GameRoomManager {
	if (!roomManagerInstance) {
		roomManagerInstance = new GameRoomManager();
	}
	return roomManagerInstance;
}

export const updateRoom = (roomId: string, updateFn: (room: GameRoom) => void) => {
	const roomManager = useRoomManager();
	const room = roomManager.getRoom(roomId);
	if (!room) return log.error({ _ctx: { roomId } }, 'Room not found');
	updateFn(room);
	roomManager.saveRoom(room);
}

export class GameRoomManager {
	private rooms: Map<string, GameRoom> = new Map();
	private storage = useStorage();
	private supabase = getServiceClient();

	constructor() {
		this.loadRooms();
	}

	private validateRoomInput(room: Partial<GameRoom>) {
		if (!room.id || !validateUUID(room.id)) {
			throw new Error(`Invalid room ID: ${room.id}`);
		}
		if (!room.name?.trim()) {
			throw new Error('Room name is required');
		}
	}

	private async findOrCreateCharacter(userId: string, nickname: string): Promise<Tables<'player_characters'>> {
		try {
			// First try to find existing character
			const { data: existing, error: findError } = await this.supabase
				.from('player_characters')
				.select('*')
				.eq('user_id', userId)
				.eq('nickname', nickname)
				.single();

			if (existing) return existing;

			// Create new character if none exists
			const { data: created, error: createError } = await this.supabase
				.from('player_characters')
				.insert({
					user_id: userId,
					nickname: nickname,
					created_at: new Date().toISOString()
				})
				.select()
				.single();

			if (createError) throw createError;
			return created;
		} catch (e: any) {
			log.error({
				ctx: 'findOrCreateCharacter',
				error: e.message,
				userId,
				nickname
			}, 'Failed to find/create character');
			throw e;
		}
	}

	private async loadRooms() {
		try {
			const { data: rooms, error } = await this.supabase
				.from('rooms')
				.select(`
					*,
					room_players (
						user_id,
						client_id,
						is_spectator,
						character_id,
						player_characters (*)
					),
					game_history (
						id,
						type,
						text,
						player_id,
						created_at
					)
				`);

			// console.log(rooms);

			if (error) throw error;

			this.rooms = new Map(rooms.map(room => [room.id, {
				...room,
				players: room.room_players?.map((rp: any) => ({
					id: rp.user_id,
					clientId: rp.client_id,
					nickname: rp.player_characters?.nickname || 'Anonymous',
					character: rp.player_characters,
					isSpectator: rp.is_spectator || false
				})) || [],
				history: room.game_history?.map((gh: any) => ({
					type: gh.type,
					text: gh.text,
					player: gh.player_id
				})) || []
			}]));
		} catch (e: any) {
			log.error({
				ctx: 'loadRooms',
				error: e.message
			}, 'Error loading rooms');
			throw e;
		}
	}

	async saveRooms(ctx?: Record<string, any>) {
		try {
			const roomsArray = Array.from(this.rooms.values());

			await Promise.all(roomsArray.map(async room => {
				// Save room base data
				await this.saveRoom(room);

				// Save room players
				await this.savePlayers(room.id, room.players);

				// Save room history
				if (room.history?.length) {
					await this.saveHistory(room.id, room.history);
				}
			}));

		} catch (e: any) {
			log.error({
				_ctx: {
					error: e.message,
					...ctx
				}
			}, 'Error saving rooms');
			throw e;
		}
	}

	private async saveHistory(roomId: string, history: GameHistoryItem[]) {
		try {
			const { error } = await this.supabase
				.from('game_history')
				.insert(history.map(item => ({
					room_id: roomId,
					type: item.type,
					text: item.text,
					player_id: item.type === 'choice' ? item.player : null,
				})));

			if (error) throw error;
		} catch (e: any) {
			log.error({ ctx: 'saveHistory', error: e.message }, 'Error saving history');
			throw e;
		}
	}

	private async savePlayers(roomId: string, players: Player[]) {
		try {
			// console.log(players);
			const { error } = await this.supabase
				.from('room_players')
				.upsert(players.map(player => ({
					room_id: roomId,
					user_id: player.id,
					client_id: player.clientId,
					is_spectator: player.isSpectator,
					character_id: player.character?.id
				})));

			if (error) throw error;
		} catch (e: any) {
			log.error({ ctx: 'savePlayers', error: e.message }, 'Error saving players');
			throw e;
		}
	}

	async updateRoom(roomId: string, update: RoomUpdate): Promise<void> {
		const room = this.getRoom(roomId);
		if (!room) return;

		// Apply updates
		Object.assign(room, update);

		if (update.history) {
			await this.saveHistory(roomId, update.history);
		}

		if (update.players) {
			await this.savePlayers(roomId, update.players);
		}

		await this.saveRoom(room);
	}

	public async saveRoom(room: GameRoom): Promise<void> {
		try {
			this.validateRoomInput(room);
			log.debug({
				ctx: 'saveRoom',
				roomId: room.id,
				roomName: room.name,
				playerCount: room.players.length
			}, 'Saving room');

			this.rooms.set(room.id, room);

			console.log(room);
			const roomData = {
				id: room.id,
				name: room.name,
				premise: room.premise,
				current_turn: room.current_turn,
				current_player: room.current_player,
				last_ai_response: room.last_ai_response,
				fast_mode: room.fast_mode,
				created_by: room.created_by,
				created_at: room.created_at,
				updated_at: new Date().toISOString()
			};

			const { error } = await this.supabase
				.from('rooms')
				.upsert([roomData]);

			if (error) {
				log.error({
					ctx: 'saveRoom',
					error: error.message,
					details: error.details,
					hint: error.hint
				}, 'Database error saving room');
				throw error
			}
		} catch (e: any) {
			log.error({
				ctx: 'saveRoom',
				error: e.message,
				room: JSON.stringify(room, null, 2)
			}, 'Failed to save room');
			throw e;
		}
	}

	async createRoom(socketId: string, roomName: string, premise: string, fastMode: boolean, createdById: string): Promise<GameRoom> {
		try {
			log.debug({
				ctx: 'createRoom',
				socketId,
				roomName,
				premise,
				fastMode,
				createdBy: createdById
			}, 'Creating room');

			const roomId = uuidv4();
			const { data: room, error } = await this.supabase
				.from('rooms')
				.insert({
					id: roomId,
					name: roomName,
					premise: premise,
					fast_mode: fastMode,
					created_by: createdById,
					current_turn: 0
				})
				.select()
				.single();

			if (error) {
				log.error({
					ctx: 'createRoom',
					error: error.message,
					details: error.details,
					hint: error.hint
				}, 'Database error creating room');
				throw error;
			}

			const roomWithPlayers: GameRoom = {
				...room,
				players: []
			};

			this.rooms.set(roomId, roomWithPlayers);
			return roomWithPlayers;
		} catch (e: any) {
			log.error({
				ctx: 'createRoom',
				error: e.message,
				input: { socketId, roomName, premise, fastMode, createdBy: createdById }
			}, 'Failed to create room');
			throw e;
		}
	}

	async joinRoom(
		socketId: string,
		roomId: string,
		nickname: string,
		clientId: string,
		isSpectator = false
	): Promise<GameRoom | null> {
		try {
			log.info({
				ctx: 'joinRoom',
				socketId,
				roomId,
				clientId,
				nickname
			}, 'Joining room');

			const room = this.rooms.get(roomId);
			if (!room) {
				throw new Error(`Room ${roomId} not found`);
			}

			// Find or create character if not spectator
			let character = undefined;
			if (!isSpectator) {
				character = await this.findOrCreateCharacter(clientId, nickname);
			}

			const player: Player = {
				id: socketId,
				clientId,
				nickname,
				character,
				isSpectator
			};

			room.players.push(player);
			await this.updateRoom(roomId, { players: room.players });
			return room;
		} catch (e: any) {
			log.error({
				ctx: 'joinRoom',
				error: e.message,
				socketId,
				roomId,
				nickname
			}, 'Failed to join room');
			throw e;
		}
	}

	async leaveRoom(socketId: string, roomId: string): Promise<void> {
		log.info({ _ctx: { socketId, roomId } }, 'Leaving room');
		const room = this.rooms.get(roomId);
		if (room) {
			room.players = room.players.filter(player => player.id !== socketId);
			if (room.players.length === 0) {
				// this.rooms.delete(roomId);
			}
			await this.saveRoom(room);
		}
	}

	getRoom(roomId: string): GameRoom | undefined {
		return this.rooms.get(roomId);
	}

	getRooms(): GameRoom[] {
		return Array.from(this.rooms.values());
	}

	async removePlayerFromAllRooms(socketId: string): Promise<void> {
		for (const [roomId] of this.rooms) {
			await this.leaveRoom(socketId, roomId);
		}
	}

	// Optional: Add method to clean up empty rooms
	async cleanupEmptyRooms(): Promise<void> {
		let hasChanges = false;
		for (const [roomId, room] of this.rooms) {
			if (room.players.length === 0) {
				this.rooms.delete(roomId);
				hasChanges = true;
			}
		}
		if (hasChanges) {
			await this.saveRooms();
		}
	}

	async clearAllRooms(): Promise<void> {
		this.rooms = new Map();
		await this.saveRooms();
	}

	async removeRoom(roomId: string): Promise<void> {
		this.rooms.delete(roomId);
		await this.saveRooms();
	}

	async getChatHistory(roomId: string): Promise<any[]> {
		try {
			let chat = await this.storage.getItem(`rooms:${roomId}:chat.json`) as any[];
			if (!chat) chat = [];
			else if (typeof chat === 'string') chat = JSON.parse(chat);
			return chat;
		} catch (e: any) {
			log.error({ _ctx: { error: e.message } }, 'Error loading chat history');
			return [];
		}
	}

	async addMessage(roomId: string, message: ChatMessage): Promise<void> {
		try {
			log.debug({ _ctx: { roomId, message } }, 'Adding message');
			const history = await this.getChatHistory(roomId);
			history.push(message);
			if (history.length > 1000) {
				history.shift();
			}
			await this.storage.setItem(`rooms:${roomId}:chat.json`, history);
		} catch (e: any) {
			log.error({ _ctx: { error: e.message } }, 'Error saving message');
		}
	}
}
