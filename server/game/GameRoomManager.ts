import { ChatMessage, PlayerCharacter, Room } from '~/types/Game';
import { useLog } from '~/composables/useLog';
import { Server } from 'socket.io';
import { useIO } from '../plugins/socket.io';
import { LLMManager } from '~/lib/llm';
import { usePromptManager } from '~/lib/prompts/PromptManager';

const log = useLog('GameRoomManager');

let roomManagerInstance: GameRoomManager | null = null;

export function useRoomManager(): GameRoomManager {
	if (!roomManagerInstance) {
		roomManagerInstance = new GameRoomManager();
	}
	return roomManagerInstance;
}

export const updateRoom = (roomId: string, updateFn: (room: Room) => void) => {
	const roomManager = useRoomManager();
	const io = useIO();
	const room = roomManager.getRoom(roomId);
	if (!room) return log.error({ _ctx: { roomId } }, 'Room not found');
	updateFn(room);
	roomManager.saveRoom(room);
	io.to(roomId).emit('roomList', roomManager.getRooms());
}

export class GameRoomManager {
	private io: Server | null = null;
	private rooms: Map<string, Room> = new Map();
	private storage = useStorage();

	constructor() {
		this.loadRooms();
	}

	addIO(io: Server) {
		this.io = io;
	}

	private async loadRooms() {
		try {
			let rooms = await this.storage.getItem('rooms:list.json') as Room[];
			if (!rooms) rooms = [];
			else if (typeof rooms === 'string') rooms = JSON.parse(rooms);
			this.rooms = new Map(rooms.map(room => [room.id, room]));
		} catch (e: any) {
			log.error({ _ctx: { error: e.message } }, 'Error loading rooms');
		}
	}

	private async saveRooms() {
		try {
			const roomsArray = Array.from(this.rooms.values());
			await this.storage.setItem('rooms:list.json', roomsArray);
		} catch (e: any) {
			log.error({ _ctx: { error: e.message } }, 'Error saving rooms');
		}
	}

	public async saveRoom(room: Room): Promise<void> {
		this.rooms.set(room.id, room);
		this.io?.to(room.id).emit('roomList', this.getRooms());
		await this.saveRooms();
	}

	async createRoom(socketId: string, premise: string, fastMode: boolean, createdBy: string): Promise<Room> {
		log.debug({ _ctx: { socketId, premise, fastMode, createdBy } }, 'Creating room');
		const roomId = Math.random().toString(36).substring(7);
		const llm = LLMManager.getInstance();
		const GenerateTitle = usePromptManager().getPrompt('GenerateTitle');
		let response = await llm.generateResponse([
			{ role: 'system', content: GenerateTitle.System.build({}) },
			{
				role: 'user', content: GenerateTitle.User.build({
					premise,
					playerName: createdBy,
				}),
			}
		], true, { roomId });
		console.log(response);
		let name = '';
		const nameMatch = response.match(/<output>(.*?)<\/output>/s);
		if (nameMatch) {
			name = nameMatch[1].trim();
		}

		const room: Room = {
			id: roomId,
			name,
			players: [],
			premise,
			history: [],
			fastMode,
			createdBy,
			currentTurn: 0,
		};

		// Initialize empty chat history for the room
		await this.storage.setItem(`rooms:${roomId}:chat.json`, []);

		this.rooms.set(roomId, room);
		await this.saveRooms();
		return room;
	}

	async joinRoom(SocketId: string, roomId: string, nickname: string, clientId: string, character?: PlayerCharacter): Promise<Room | null> {
		log.info({ _ctx: { SocketId, roomId, clientId, nickname, character } }, 'Joining room');
		const room = this.rooms.get(roomId);
		if (room) {
			room.players.push({
				id: SocketId,
				clientId,
				nickname,
				character,
			});
			await this.saveRooms();
			return room;
		}
		return null;
	}

	async leaveRoom(socketId: string, roomId: string): Promise<void> {
		log.info({ _ctx: { socketId, roomId } }, 'Leaving room');
		const room = this.rooms.get(roomId);
		if (room) {
			room.players = room.players.filter(player => player.id !== socketId);
			if (room.players.length === 0) {
				// this.rooms.delete(roomId);
			}
			await this.saveRooms();
		}
	}

	getRoom(roomId: string): Room | undefined {
		return this.rooms.get(roomId);
	}

	getRooms(): Room[] {
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
		const currentRoomIds = Array.from(this.rooms.keys());
		this.rooms = new Map();
		this.io?.to(currentRoomIds).emit('kicked');
		await this.saveRooms();
	}

	async removeRoom(roomId: string): Promise<void> {
		this.rooms.delete(roomId);
		this.io?.to(roomId).emit('kicked');
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
