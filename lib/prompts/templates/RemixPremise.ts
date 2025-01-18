import { createPrompt } from '../builder'

interface SystemInput { }

interface UserInput extends SystemInput {
	premise: string,
	playerName?: string
}

const info = {
	fast: false
}

const llmOptions = {
	temperature: 0.25
}

const System = createPrompt<SystemInput>((input) => `Assistant is a creative game master crafting a multiplayer interactive story.
Assistant's task is to expand on or remix the provided premise, responding in the following format:

<output>
Expanded Premise
</output>`)

const User = createPrompt<UserInput>((input) => {
	let prompt = `Input Premise: ${input.premise}\n`;

	if (input.playerName) {
		prompt += `Proposed by ${input.playerName}\n`;
	}

	return prompt;
});

export default { System, User, llmOptions, info };
