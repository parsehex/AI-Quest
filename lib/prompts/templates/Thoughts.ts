import type { GameHistoryItem, PlayerCharacter } from '~/types/Game'
import { createPrompt } from '../builder'

interface SystemInput { }

interface UserInput extends SystemInput {
	currentPlayer: string
	roomName?: string
	premise: string,
	history: GameHistoryItem[],
	isNewPlayer: boolean,
	playerCharacter?: PlayerCharacter
}

const info = {
	fast: true
}

const llmOptions = {
	model: 'huihui_ai/llama3.2-abliterate:3b-instruct'
}

const System = createPrompt<SystemInput>((input) => `Assistant's task is to help the Game Master, who is crafting a multiplayer interactive adventure, and needs to use the provided game information to write the next turn.
Respond in the following format:
<output>
Brief thoughts to help the Game Master use the provided information in order to drive the game forward. Help the GM think of possibilities and directions for the player's next turn. Keep things steadily engaging and moving forward.
Be helpful without being prescriptive. Talk as in an inner monologue to oneself.
Respond with one paragraph at most.
</output>`);

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

	prompt += 'Thoughts for the Game Master:';

	return prompt;
});

export default { System, User, llmOptions, info };
