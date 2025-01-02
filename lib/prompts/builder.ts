type PromptInputs = Record<string, any>;

export const createPrompt = <T extends PromptInputs>(
	buildFn: (inputs: T) => string
) => {
	return (inputs: T): string => buildFn(inputs);
};
