import OpenAI from 'openai';
import { useLog } from '~/composables/useLog';

const log = useLog('lib/llm');

// NOTES
// - As it is right now, each room is assigned to a certain model (controlled by fastMode)
// - What I now (eventually) want is for each user to have their own model (+ API Key)
// - If the request fails or the user isn't properly set up then we exit early and that player's turn is skipped (fallback in-game action is used e.g. "Player stands motionless.")

export class LLMManager {
	private static instance: LLMManager | null = null;
	private isProcessing = false;

	static getInstance(): LLMManager {
		if (!LLMManager.instance) {
			LLMManager.instance = new LLMManager();
		}
		return LLMManager.instance;
	}

	async generateResponse(messages: any[], fastMode: boolean | null = false, extraCtx?: Record<string, unknown>): Promise<string> {
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

			const fast = fastMode ? 'fast' : 'quality';
			if (extraCtx) {
				log.debug({ _ctx: { model, baseURL, ...extraCtx } }, `Using ${fast} model`);
			} else {
				log.debug({ _ctx: { model, baseURL } }, `Using ${fast} model`);
			}

			// Create a new OpenAI instance with the appropriate baseURL
			const openai = new OpenAI({
				baseURL,
				apiKey: config.private.openrouterApiKey,
			});

			const Request = {
				messages,
				model,
				temperature: 0.25,
				max_tokens: 768,
			};

			const completion = await openai.chat.completions.create(Request);

			const Response = completion.choices[0]
			const resStr = Response.message.content || "No response generated";
			if (extraCtx) {
				log.debug({ _ctx: { Request, Response, ...extraCtx } }, 'LLM input / output');
			}
			return resStr;
		} catch (e: any) {
			log.error({ _ctx: { error: e.message } }, 'Error generating response');
			return "Error generating AI response";
		} finally {
			this.isProcessing = false;
		}
	}

	get isLoading(): boolean {
		return this.isProcessing;
	}
}
