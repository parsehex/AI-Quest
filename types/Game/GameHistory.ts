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

export function isNarrativeOrIntro(item: GameHistoryItem): item is (GameHistoryNarrative | GameHistoryChoice) {
	return item.type === 'narrative' || item.type === 'intro';
}

export function isChoice(item: GameHistoryItem): item is GameHistoryChoice {
	return item.type === 'choice';
}
