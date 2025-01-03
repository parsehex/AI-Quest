import { createHash } from 'crypto';
import { useLog } from '~/composables/useLog';

const log = useLog('lib/tts');

interface TTSResponse {
	status: 'generate-success' | 'generate-failure' | 'cached';
	output_file_path: string;
	output_file_url: string;
	output_cache_url: string; // e.g. /audiocache/myoutputfile_17359031872ef42.wav
	hash?: string;
}

export class TTSManager {
	private static instance: TTSManager | null = null;
	private isProcessing = false;
	private storage = useStorage('tts');

	static getInstance(): TTSManager {
		if (!TTSManager.instance) {
			TTSManager.instance = new TTSManager();
		}
		return TTSManager.instance;
	}

	private hashText(text: string): string {
		return createHash('md5').update(text).digest('hex');
	}

	async generateAudio(text: string, extraCtx?: Record<string, unknown>): Promise<TTSResponse | null> {
		try {
			const hash = this.hashText(text);

			// Check cache first
			const cached = await this.storage.getItem<string>(hash);
			if (cached) {
				if (extraCtx) {
					log.debug({ _context: { hash, ...extraCtx } }, 'Served cached TTS');
				}
				return {
					status: 'cached',
					output_cache_url: cached,
					hash,
					output_file_path: '',
					output_file_url: ''
				};
			}

			// Rest same as before...
			this.isProcessing = true;
			const config = useRuntimeConfig();

			if (!config.private.alltalkTtsUrl) {
				log.warn({ _context: { hash, ...extraCtx } }, 'TTS URL not set');
				return null;
			}

			const formData = new URLSearchParams();
			formData.append('text_input', text);

			const response = await fetch(`${config.private.alltalkTtsUrl}/api/tts-generate`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: formData
			});

			const str = await response.text();
			const result: TTSResponse = JSON.parse(str);
			result.hash = hash;

			if (result.status !== 'generate-success') {
				log.error({ _context: { hash, result, ...extraCtx } }, 'Error generating TTS');
				return null;
			}

			// e.g. /audiocache/myoutputfile_17359053275b5d0.wav
			const audioResponse = await fetch(config.private.alltalkTtsUrl + result.output_cache_url);
			const audioBuffer = await audioResponse.arrayBuffer();
			await this.storage.setItemRaw(hash + '.wav', Buffer.from(audioBuffer));

			return result;
		} catch (e: any) {
			log.error({ _context: { error: e.message, ...extraCtx } }, 'Error generating TTS');
			return null;
		} finally {
			this.isProcessing = false;
		}
	}
}
