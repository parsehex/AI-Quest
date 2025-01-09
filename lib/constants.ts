export const MODEL_MAP = {
	dev: {
		fast: ['http://127.0.0.1:11434/v1/', 'llama3.2:3b-instruct-q6_K'],
		good: ['http://127.0.0.1:11434/v1/', 'qwen2.5:latest']
	},
	prod: {
		fast: ['https://openrouter.ai/api/v1', 'meta-llama/llama-3.1-8b-instruct'],
		good: ['https://openrouter.ai/api/v1', 'meta-llama/llama-3.3-70b-instruct']
	}
};
