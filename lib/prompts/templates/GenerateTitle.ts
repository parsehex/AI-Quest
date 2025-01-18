import { createPrompt } from '../builder'

interface SystemInput { }

interface UserInput extends SystemInput {
	premise: string,
	playerName?: string
}

const info = {
	fast: true
}

const llmOptions = {
	temperature: 0.75,
	max_tokens: 75
}

const System = createPrompt<SystemInput>((input) => `Assistant's task is to write a creative title for an interactive game based on the provided premise.
Respond in the following format and without further prose:

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

export default { System, User, llmOptions, info };
