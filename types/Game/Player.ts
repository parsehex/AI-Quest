export interface PlayerCharacter {
	nickname?: string;
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
	isSpectator: boolean;
	character?: PlayerCharacter;
}
