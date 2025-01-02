import OpenAI from 'openai';
import { useLog } from '~/composables/useLog';

const log = useLog('lib/llm');

export class LLMManager {
	private static instance: LLMManager | null = null;
	private isProcessing = false;

	static getInstance(): LLMManager {
		if (!LLMManager.instance) {
			LLMManager.instance = new LLMManager();
		}
		return LLMManager.instance;
	}

	async generateResponse(messages: any[], fastMode: boolean = false): Promise<string> {
		try {
			this.isProcessing = true;
			const config = useRuntimeConfig();

			// Use fast mode settings if enabled and available
			const baseURL = fastMode && config.private.openaiBaseUrl_fast
				? config.private.openaiBaseUrl_fast
				: config.private.openaiBaseUrl;

			const model = fastMode && config.private.model_fast
				? config.private.model_fast
				: config.private.model;

			log.debug('Using model:', model, 'and baseURL:', baseURL);

			// Create a new OpenAI instance with the appropriate baseURL
			const openai = new OpenAI({
				baseURL,
				apiKey: config.private.openrouterApiKey,
			});

			const completion = await openai.chat.completions.create({
				messages,
				model,
				temperature: 0.25,
			});

			return completion.choices[0].message.content || "No response generated";
		} catch (error) {
			log.error("Error generating response:", error);
			return "Error generating AI response";
		} finally {
			this.isProcessing = false;
		}
	}

	get isLoading(): boolean {
		return this.isProcessing;
	}
}
