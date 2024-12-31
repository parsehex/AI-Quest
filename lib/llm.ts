import OpenAI from "openai";

export class LLMManager {
	private static instance: LLMManager | null = null;
	private openai: OpenAI;
	private isProcessing = false;

	private constructor() {
		const cfg = useRuntimeConfig();
		this.openai = new OpenAI({
			baseURL: 'https://openrouter.ai/api/v1',
			apiKey: cfg.private.openrouterApiKey,
		});
	}

	static getInstance(): LLMManager {
		if (!LLMManager.instance) {
			LLMManager.instance = new LLMManager();
		}
		return LLMManager.instance;
	}

	async generateResponse(messages: any[]): Promise<string> {
		try {
			this.isProcessing = true;
			const completion = await this.openai.chat.completions.create({
				messages,
				model: useRuntimeConfig().private.model,
			});
			return completion.choices[0].message.content || "No response generated";
		} catch (error) {
			console.error("Error generating response:", error);
			return "Error generating AI response";
		} finally {
			this.isProcessing = false;
		}
	}

	get isLoading(): boolean {
		return this.isProcessing;
	}
}
