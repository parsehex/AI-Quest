export type PromptMetadata = {
	description?: string;
	variables?: Record<string, string>;
	format?: string;
	notes?: string;
};

export type PromptPair = {
	text: string;  // Original template text
	build: (inputs: any) => string;  // Compiled function
	metadata?: PromptMetadata;
};

export type PromptTemplate = {
	name: string;
	System: PromptPair;
	User: PromptPair;
	metadata?: PromptMetadata;
	isDefault?: boolean;
	isRuntime?: boolean;
};

export type RuntimePrompts = Record<string, PromptTemplate>;
