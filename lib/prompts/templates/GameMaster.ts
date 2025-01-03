import type { GameHistoryItem, PlayerCharacter } from '~/types/Game'
import { createPrompt } from '../builder'

interface SystemProps {
	currentPlayer: string
}

interface UserProps extends SystemProps {
	premise: string,
	history: GameHistoryItem[],
	latestEvent: string,
	isNewPlayer: boolean,
	playerCharacter?: PlayerCharacter
}

export const GameMasterSystem = createPrompt<SystemProps>((input) => `Assistant is a creative game master crafting a multiplayer interactive story.
Assistant's task is to create a response with the following format:
<intro>
A brief intro of the current situation
</intro>
<narrative>
Detailed description of the events and actions that happen, in the 3rd person. Follow up with highly relevant context and provide \`${input.currentPlayer}\`  with a cue to make a decision.
</narrative>
<choices>
- First choice \`${input.currentPlayer}\` can make
- Next choice
- (Up to 5 total choices)
</choices>
Use the choice text without anything preceding. Create choices which make sense to push the events forward.
Pay attention and react to the latest choice in a natural way.`)

// TODO convert history to messages
export const GameMasterUser = createPrompt<UserProps>((input) => {
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
		prompt += `Events:\n`;
		input.history.forEach(event => {
			if (event.type === 'narrative') {
				prompt += `  ${event.text}\n`;
			} else if (event.type === 'choice') {
				prompt += `  Player \`${event.player}\` chose: ${event.text}\n`;
			}
		});
	}
	return prompt;
});
