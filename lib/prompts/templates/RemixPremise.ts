import { createPrompt } from '../builder'

interface SystemInput { }

interface UserInput extends SystemInput {
	premise: string,
	playerName?: string
}

const System = createPrompt<SystemInput>((input) => `Assistant is a creative game master crafting a multiplayer interactive story.
Assistant's task is to expand on or remix the provided premise. Respond in the following format:

<output>

</output>`)

const User = createPrompt<UserInput>((input) => {
	let prompt = `Input Premise: ${input.premise}\n`;

	if (input.playerName) {
		prompt += `Proposed by ${input.playerName}\n`;
	}

	return prompt;
});

export default { System, User };
