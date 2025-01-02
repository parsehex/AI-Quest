import type { PlayerCharacter } from '~/types/Game';
import { createPrompt } from '../builder'

interface Props {
	currentPlayer: string,
	premise: string,
	history: string[],
	latestEvent: string,
	isNewPlayer: boolean,
	playerCharacter?: PlayerCharacter
}

export default createPrompt<Props>((input) => {
	let prompt = `Original premise: ${input.premise}\n`;

	// Add character info
	if (input.currentPlayer && input.playerCharacter) {
		prompt += `Current Player: ${input.currentPlayer}\n`;
		if (input.playerCharacter.class)
			prompt += `  Class: ${input.playerCharacter.class}\n`;
		if (input.playerCharacter.race)
			prompt += `  Race: ${input.playerCharacter.race}\n`;
		if (input.playerCharacter.background)
			prompt += `  Background: ${input.playerCharacter.background}\n`;
	}

	if (input.history.length) {
		prompt += `Events:\n${input.history.join('\n')}\n`;
	}
	return prompt;
});
