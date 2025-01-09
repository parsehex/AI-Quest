import { createPrompt } from '../builder'

interface SystemInput { }

interface UserInput extends SystemInput {
	premise: string,
	playerName?: string
}

const metadata = {
	description: "Generates a title for a game based on the provided premise",
	variables: {
		premise: "Original game premise",
		playerName: "Name of the player who started the game"
	},
	format: `<output>Game Title</output>`
};

const systemText = `Assistant is a creative game master crafting a multiplayer interactive story.
Assistant's task is to write a title for this game based on the provided premise. Respond in the following format:

<output>
Name
</output>`;

const userText = `Game Premise: {{premise}}
{{#if playerName}}Started by {{playerName}}{{/if}}`;

const System = createPrompt<SystemInput>(
	systemText,
	() => systemText,
	metadata
);

const User = createPrompt<UserInput>(
	userText,
	(input) => {
		let text = userText;
		text = text.replace('{{premise}}', input.premise);
		text = text.replace(/{{#if playerName}}([\s\S]*?){{\/if}}/gm,
			input.playerName ? `Started by ${input.playerName}` : ''
		);
		return text;
	},
	metadata
);

export default {
	name: 'GenerateTitle',
	System,
	User,
	metadata
};
