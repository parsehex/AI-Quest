import type { Player } from './Player';
import type { GameHistoryItem } from './GameHistory';

export interface LastAIResponse {
	intro: string;
	narrative: string;
	choices: string[];
	/** If provided, is a path to audio file reading the current intro and narrative. */
	tts?: string;
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
	lastAiResponse?: LastAIResponse;
	currentTurn: number;
	currentPlayer?: string;
	history: GameHistoryItem[];
	fastMode?: boolean;
	createdBy: string;
}
