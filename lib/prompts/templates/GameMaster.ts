import type { GameHistoryItem, PlayerCharacter } from '~/types/Game'
import { createPrompt } from '../builder'

interface SystemInput {
	currentPlayer: string
}

interface UserInput extends SystemInput {
	premise: string,
	history: GameHistoryItem[],
	latestEvent: string,
	isNewPlayer: boolean,
	playerCharacter?: PlayerCharacter
}

const systemText = `Assistant is a creative game master crafting a multiplayer interactive story.
Assistant's task is to create a response with the following format:
<intro>
A brief intro of the current situation
</intro>
<narrative>
Detailed description of the events and actions that happen, in the 3rd person. Follow up with highly relevant context and provide \`{{currentPlayer}}\`  with a cue to make a decision.
</narrative>
<choices>
- First choice \`{{currentPlayer}}\` can make
- Next choice
- (Up to 5 total choices)
</choices>
Use the choice text without anything preceding. Create choices which make sense to push the events forward.
Pay attention and react to the latest choice in a natural way.`;

const userText = `Original premise: {{premise}}
{{#if currentPlayer}}
Current Player: {{currentPlayer}}
{{#if playerCharacter}}
  Class: {{playerCharacter.class}}
  Race: {{playerCharacter.race}}
  Background: {{playerCharacter.background}}
{{/if}}
{{/if}}

Events:
{{#each history}}
{{intro}}
{{narrative}}
Player {{player}} chose: {{choice}}
{{/each}}`;

const metadata = {
	description: "Manages the game flow and generates story responses",
	variables: {
		currentPlayer: "Name of the active player",
		premise: "Original game premise",
		playerCharacter: "Character details of current player"
	},
	format: `<intro>situation</intro>
<narrative>story</narrative>
<choices>options</choices>`
};

const System = createPrompt<SystemInput>(systemText,
	(input) => systemText.replace('{{currentPlayer}}', input.currentPlayer),
	metadata);

// TODO convert history to messages
const User = createPrompt<UserInput>(
	userText,
	(input) => {
		let text = userText;

		// Replace simple variables
		text = text.replace('{{premise}}', input.premise);

		// Handle currentPlayer conditional block
		const playerBlock = input.currentPlayer
			? `Current Player: ${input.currentPlayer}
${input.playerCharacter ? `  Class: ${input.playerCharacter.class}
  Race: ${input.playerCharacter.race}
  Background: ${input.playerCharacter.background}` : ''}`
			: '';
		text = text.replace(/{{#if currentPlayer}}([\s\S]*?){{\/if}}/gm, playerBlock);

		// Handle history loop
		const historyText = input.history.map(event =>
			`${event.intro}
${event.narrative}
Player ${event.player} chose: ${event.choice}`
		).join('\n');
		text = text.replace(/{{#each history}}([\s\S]*?){{\/each}}/gm, historyText);

		return text;
	},
	metadata
);

export default {
	name: 'GameMaster',
	System, User, metadata
};
