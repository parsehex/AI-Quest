import OpenAI from 'openai';
import { useLog } from '~/composables/useLog';
import { MODEL_MAP } from './constants';
import type { ModelConfig } from '~/types/Game/AI';

const log = useLog('lib/llm');

export class LLMManager {
	private static instance: LLMManager | null = null;
	private isProcessing = false;
	public modelConfig: ModelConfig;

	private constructor() {
		this.modelConfig = MODEL_MAP as ModelConfig;
	}

	static getInstance(): LLMManager {
		if (!LLMManager.instance) {
			LLMManager.instance = new LLMManager();
		}
		return LLMManager.instance;
	}

	// TODO convert fastMode to type
	async generateResponse(messages: any[], fastMode: boolean = false, extraCtx?: Record<string, unknown>, modelOverride = ''): Promise<string> {
		try {
			this.isProcessing = true;
			const config = useRuntimeConfig();

			// Determine environment (dev/prod) and type
			const isProd = process.env.NODE_ENV === 'production';
			const env = isProd ? 'prod' : 'dev';
			const type = fastMode ? 'fast' : 'good';

			// Get model config for current environment and speed
			let [baseURL, model] = this.modelConfig[env][type];
			if (modelOverride) model = modelOverride;

			const mode = `${env}/${type}`;
			log.debug({ _ctx: { model, baseURL, mode } }, `Using ${mode} model`);

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
				frequency_penalty: 1.01,
				presence_penalty: 1.05,
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
