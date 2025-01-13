import type { GameHistoryItem, PlayerCharacter } from '~/types/Game'
import { createPrompt } from '../builder'

const info = {
	description: 'Used for the main game loop to generate a turn + choices'
}

interface SystemInput {
	currentPlayer: string
	roomName?: string
	thoughts?: string
}

interface UserInput extends SystemInput {
	premise: string,
	history: GameHistoryItem[],
	// latestEvent: string,
	isNewPlayer: boolean,
	playerCharacter?: PlayerCharacter
	// TODO modelType to use
}

// TODO improvements
// - split off GenerateChoices
// - combine intro and narrative
//   - prompt to write 2+ paragraphs, using first as intro
//   - ui render first paragraph as intro

const System = createPrompt<SystemInput>((input) => `Assistant is a creative game master crafting a multiplayer interactive adventure.
Assistant's task is to create a response with the following format:
<intro>
A brief intro or recap of what's happening now
</intro>
<narrative>
Detailed and contextually specific description of the events and actions that happen, spoken in the 3rd person without talking to the player. Incorporate player choices and cue the player "${input.currentPlayer}" to make a decision, introducing them to the situation if necessary.
</narrative>
<choices>
- Choices that ${input.currentPlayer} can make
- One choice per line
- (Up to 4 choices)
</choices>
Create contextually-engaging choices to push the adventure forward.
Respond with the sections' text without further prose.
Pay attention and react to the latest event in a natural way.${input.thoughts ? `\n\nThese are the Game Master's thoughts:\n${input.thoughts}` : ''}`);

// TODO convert history to messages
const User = createPrompt<UserInput>((input) => {
	let prompt = '';
	if (input.roomName) {
		prompt += `Info about "${input.roomName}"${input.history.length > 0 ? ' so far' : ''}:\n`;
	}
	prompt += `Starting premise: ${input.premise}\n`;

	if (input.history.length) {
		prompt += `History:\n`;
		input.history.forEach((event, i) => {
			if (i > 0) prompt += '\n';
			if (i === input.history.length - 1) {
				prompt += `Latest event:\n`;
			}
			prompt += event.intro + '\n';
			prompt += event.narrative + '\n';
			prompt += `${event.player} chose: ${event.choice}\n`;
		});
	}

	// Add character info
	if (input.currentPlayer) {
		prompt += `Current Player's Turn: ${input.currentPlayer}\n`;
		if (input.playerCharacter?.class)
			prompt += `\tClass: ${input.playerCharacter.class}\n`;
		if (input.playerCharacter?.race)
			prompt += `\tRace: ${input.playerCharacter.race}\n`;
		if (input.playerCharacter?.background)
			prompt += `\tBackground: ${input.playerCharacter.background}\n`;
	}

	return prompt;
});

export default { System, User, info };
