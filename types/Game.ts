export interface Room {
	id: string;
	name: string;
	players: string[]; // socket IDs
}
