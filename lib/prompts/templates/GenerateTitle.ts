import type { GameHistoryItem, PlayerCharacter } from '~/types/Game'
import { createPrompt } from '../builder'

interface SystemProps { }

interface UserProps extends SystemProps {
	premise: string,
	playerName?: string
}

export const GenerateTitleSystem = createPrompt<SystemProps>((input) => `Assistant is a creative game master crafting a multiplayer interactive story.
Assistant's task is to write a title for this game based on the provided premise. Respond in the following format:

<output>
Name
</output>`)

export const GenerateTitleUser = createPrompt<UserProps>((input) => {
	let prompt = `Game Premise: ${input.premise}\n`;

	if (input.playerName) {
		prompt += `Started by ${input.playerName}\n`;
	}

	return prompt;
});
