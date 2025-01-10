import { createPrompt } from '../builder'

interface SystemInput { }

interface UserInput extends SystemInput {
	premise: string,
	playerName?: string
}

const System = createPrompt<SystemInput>((input) => `Assistant is a creative game master crafting a multiplayer interactive story.
Assistant's task is to write a title for this game based on the provided premise, responding in the following format:

<output>
Name
</output>`)

const User = createPrompt<UserInput>((input) => {
	let prompt = `Game Premise: ${input.premise}\n`;

	if (input.playerName) {
		prompt += `Started by ${input.playerName}\n`;
	}

	return prompt;
});

export default { System, User };
