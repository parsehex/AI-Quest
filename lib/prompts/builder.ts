import type { PromptMetadata } from '~/types/Prompts';

type PromptInputs = Record<string, any>;

export const createPrompt = <T extends PromptInputs>(
	text: string,
	buildFn: (inputs: T) => string,
	metadata?: PromptMetadata
) => {
	return {
		text,
		build: buildFn,
		metadata
	};
};
