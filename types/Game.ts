export interface PlayerCharacter {
	class: string;
	race: string;
	background: string;
	traits: string[];
	skills: string[];
	equipment: string[];
}

export interface Player {
	id: string;
	clientId: string;
	nickname: string;
	character?: PlayerCharacter;
}

export interface LoadingState {
	message: string;
	progress?: number;
}

export interface GameHistoryNarrative {
	type: 'narrative' | 'intro';
	text: string;
}

export interface GameHistoryChoice {
	type: 'choice';
	text: string;
	player: string;
}

export type GameHistoryItem = GameHistoryNarrative | GameHistoryChoice;

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
	currentTurn: number;
	currentPlayer?: string;
	history: GameHistoryItem[];
	fastMode?: boolean;
	createdBy: string;
}

export interface ChatMessage {
	sender: string
	nickname: string
	text: string
	timestamp?: Date
}
