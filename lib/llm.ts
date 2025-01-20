import OpenAI from 'openai';
import { useLog } from '~/composables/useLog';
import { MODEL_MAP } from './constants';
import type { ModelConfig } from '~/types/Game/AI';
import { delay } from './utils';

const log = useLog('lib/llm');

const isDev = import.meta.dev;
const DELAY_BETWEEN_CALLS = isDev ? 250 : 1000;

export class LLMManager {
	private static instance: LLMManager | null = null;
	private isProcessing = false;
	public modelConfig: ModelConfig;
	private lastCall = 0;

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
	async generateResponse(messages: any[], fastMode: boolean = false, extraCtx?: Record<string, unknown>, options?: Record<string, any>): Promise<string> {
		let Request: any;
		let Response: any;
		try {
			this.isProcessing = true;
			const config = useRuntimeConfig();

			// Determine environment (dev/prod) and type
			const isProd = process.env.NODE_ENV !== 'production';
			const env = isProd ? 'prod' : 'dev';
			const type = fastMode ? 'fast' : 'good';

			// Get model config for current environment and speed
			const [baseURL, model] = this.modelConfig[env][type];

			const mode = `${env}/${type}`;
			log.debug({ _ctx: { model, baseURL, mode } }, `Using ${mode} model`);

			while (Date.now() - this.lastCall < DELAY_BETWEEN_CALLS) {
				await delay(100);
			}
			this.lastCall = Date.now();

			const openai = new OpenAI({
				baseURL,
				apiKey: config.private.openrouterApiKey,
				defaultHeaders: {
					"X-Title": "AI Quest",
				},
			});

			Request = {
				messages,
				model,
				temperature: 0.15,
				max_tokens: 768,
				frequency_penalty: 1.01,
				presence_penalty: 1.05,
			};
			Object.assign(Request, options);

			const completion = await openai.chat.completions.create(Request);

			Response = completion;
			Response = Response.choices[0];
			const resStr = Response.message.content || "No response generated";
			if (extraCtx) {
				log.debug({ _ctx: { Request, Response, ...extraCtx } }, 'LLM input / output');
			}
			return resStr;
		} catch (e: any) {
			log.error({ _ctx: { error: e, Request, Response } }, 'Error generating response');
			return "Error generating AI response";
		} finally {
			this.isProcessing = false;
		}
	}

	get isLoading(): boolean {
		return this.isProcessing;
	}
}
