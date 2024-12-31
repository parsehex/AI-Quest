export interface Player {
	id: string;
	nickname: string;
}

export interface Room {
	id: string;
	name: string;
	players: Player[];
}

export interface Message {
	sender: string
	nickname: string
	text: string
	timestamp?: Date
}
