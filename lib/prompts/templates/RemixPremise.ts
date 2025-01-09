import { createPrompt } from '../builder'

interface SystemInput { }

interface UserInput extends SystemInput {
	premise: string,
	playerName?: string
}

const metadata = {
	description: "Expands or remixes a game premise into something more interesting",
	variables: {
		premise: "Original game premise",
		playerName: "Name of the player proposing the premise"
	},
	format: `<output>Remixed premise</output>`
};

const systemText = `Assistant is a creative game master crafting a multiplayer interactive story.
Assistant's task is to expand on or remix the provided premise. Respond in the following format:

<output>
A creative and expanded version of the input premise
</output>`;

const userText = `Input Premise: {{premise}}
{{#if playerName}}Proposed by {{playerName}}{{/if}}`;

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
			input.playerName ? `Proposed by ${input.playerName}` : ''
		);
		return text;
	},
	metadata
);

export default {
	name: 'RemixPremise',
	System,
	User,
	metadata
};
