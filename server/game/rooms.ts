import { Message, Room } from '~/types/Game';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

export class RoomManager {
	private rooms: Map<string, Room> = new Map();
	private readonly storageDir = 'data/rooms';
	private readonly storageFile = path.join(this.storageDir, 'rooms.json');

	constructor() {
		this.loadRooms();
	}

	// Load rooms from storage
	private async loadRooms() {
		try {
			if (existsSync(this.storageFile)) {
				const data = await readFile(this.storageFile, 'utf-8');
				const rooms = JSON.parse(data) as Room[];
				this.rooms = new Map(rooms.map(room => [room.id, room]));
			}
		} catch (error) {
			console.error('Error loading rooms:', error);
		}
	}

	// Save rooms to storage
	private async saveRooms() {
		try {
			const roomsArray = Array.from(this.rooms.values());
			await writeFile(
				this.storageFile,
				JSON.stringify(roomsArray, null, 2)
			);
		} catch (error) {
			console.error('Error saving rooms:', error);
		}
	}

	async createRoom(socketId: string, roomName: string, premise: string): Promise<Room> {
		const roomId = Math.random().toString(36).substring(7);
		const room: Room = {
			id: roomId,
			name: roomName,
			players: [],
			premise,
			history: [],
		};

		// Create room directory and chat file
		const roomDir = path.join(this.storageDir, roomId)
		await mkdir(roomDir, { recursive: true })
		await writeFile(
			this.getRoomChatPath(roomId),
			JSON.stringify([], null, 2)
		)

		this.rooms.set(roomId, room);
		await this.saveRooms();
		return room;
	}

	async joinRoom(socketId: string, roomId: string, nickname: string): Promise<Room | null> {
		const room = this.rooms.get(roomId);
		if (room) {
			room.players.push({
				id: socketId,
				nickname
			});
			await this.saveRooms();
			return room;
		}
		return null;
	}

	async leaveRoom(socketId: string, roomId: string): Promise<void> {
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

	private getRoomChatPath(roomId: string): string {
		return path.join(this.storageDir, roomId, 'chat.json')
	}

	async getChatHistory(roomId: string): Promise<any[]> {
		try {
			const chatPath = this.getRoomChatPath(roomId)
			const data = await readFile(chatPath, 'utf-8')
			return JSON.parse(data)
		} catch (error) {
			console.error('Error loading chat history:', error)
			return []
		}
	}

	async addMessage(roomId: string, message: Message): Promise<void> {
		try {
			console.log('Adding message:', message);
			const chatPath = this.getRoomChatPath(roomId)
			const history = await this.getChatHistory(roomId)
			history.push(message)
			await writeFile(chatPath, JSON.stringify(history, null, 2))
		} catch (error) {
			console.error('Error saving message:', error)
		}
	}
}
