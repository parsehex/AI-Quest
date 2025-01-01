export interface Player {
	id: string; // socket id
	clientId: string;
	nickname: string;
}

export interface Room {
	id: string;
	name: string;
	players: Player[];
	premise: string;
	aiLoading?: boolean;
	lastAiResponse?: {
		intro: string;
		narrative: string;
		choices: string[];
	};
	currentTurn?: number;
	currentPlayer?: string;
	history?: string[];
	fastMode?: boolean;
	createdBy: string;
}

export interface Message {
	sender: string
	nickname: string
	text: string
	timestamp?: Date
}