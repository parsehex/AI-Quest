export interface Player {
	id: string; // socket id
	clientId: string;
	nickname: string;
}

export interface LoadingState {
	message: string;
	progress?: number;
}

export interface Room {
	id: string;
	name: string;
	players: Player[];
	premise: string;
	aiLoading?: LoadingState;
	lastAiResponse?: {
		intro: string;
		narrative: string;
		choices: string[];
	};
	currentTurn?: number;
	currentPlayer?: string;
	history: string[];
	fastMode?: boolean;
	createdBy: string;
}

export interface ChatMessage {
	sender: string
	nickname: string
	text: string
	timestamp?: Date
}
