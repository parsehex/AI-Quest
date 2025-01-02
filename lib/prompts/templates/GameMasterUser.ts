import { createPrompt } from '../builder'

interface Props {
	currentPlayer: string,
	premise: string,
	history: string[],
	latestEvent: string,
	isNewPlayer: boolean
}

export default createPrompt<Props>((input) => {
	let prompt = `Original premise: ${input.premise}\n`;
	if (input.history.length) {
		prompt += `Events:\n${input.history.join('\n')}\n`;
	}
	if (input.latestEvent) {
		prompt += `Latest event:\n${input.latestEvent}\n`;
	}
	if (input.isNewPlayer) {
		prompt += `New Player: ${input.currentPlayer}\n`;
	} else if (input.currentPlayer) {
		prompt += `Current Player: ${input.currentPlayer}\n`;
	}
	return prompt;
});
