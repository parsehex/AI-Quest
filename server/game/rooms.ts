import { Room } from '~/types/Game';
import { writeFile, readFile } from 'fs/promises';
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

	async createRoom(socketId: string, roomName: string): Promise<Room> {
		const roomId = Math.random().toString(36).substring(7);
		const room: Room = {
			id: roomId,
			name: roomName,
			players: []
		};
		this.rooms.set(roomId, room);
		await this.saveRooms();
		return room;
	}

	async joinRoom(socketId: string, roomId: string): Promise<Room | null> {
		const room = this.rooms.get(roomId);
		if (room) {
			room.players.push(socketId);
			await this.saveRooms();
			return room;
		}
		return null;
	}

	async leaveRoom(socketId: string, roomId: string): Promise<void> {
		const room = this.rooms.get(roomId);
		if (room) {
			room.players = room.players.filter(id => id !== socketId);
			if (room.players.length === 0) {
				// Commented out as per your version
				// this.rooms.delete(roomId);
			}
			await this.saveRooms();
		}
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
}
