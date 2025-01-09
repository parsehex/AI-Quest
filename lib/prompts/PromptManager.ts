import type { PromptTemplate, RuntimePrompts } from '~/types/Prompts';
import * as DefaultTemplates from './templates';
import { deepAssign } from '../utils';

export class PromptManager {
	private static instance: PromptManager | null = null;
	private storage = useStorage('server-options');
	private runtimePrompts: RuntimePrompts = {};

	private constructor() {
		this.loadPrompts();
	}

	static getInstance(): PromptManager {
		if (!PromptManager.instance) {
			PromptManager.instance = new PromptManager();
		}
		return PromptManager.instance;
	}

	private async loadPrompts() {
		try {
			const saved = await this.storage.getItem('prompt-templates.json') as RuntimePrompts;
			if (saved) {
				this.runtimePrompts = saved;
			}
		} catch (e) {
			console.error('Error loading prompts:', e);
		}
	}

	async savePrompts() {
		await this.storage.setItem('prompt-templates.json', this.runtimePrompts);
	}

	getPrompt(name: string) {
		if (!this.runtimePrompts[name]) {
			return (DefaultTemplates as any)[name];
		}
		const defaultTemplate = (DefaultTemplates as any)[name];
		return {
			...this.runtimePrompts[name],
			System: {
				...this.runtimePrompts[name].System,
				build: this.runtimePrompts[name].System.build || defaultTemplate.System.build
			},
			User: {
				...this.runtimePrompts[name].User,
				build: this.runtimePrompts[name].User.build || defaultTemplate.User.build
			}
		};
	}

	async updatePrompt(name: string, template: Partial<PromptTemplate>) {
		// if template is {}, just delete the runtime prompt
		if (Object.keys(template).length === 0) {
			console.log('deleting', name);
			delete this.runtimePrompts[name];
			await this.savePrompts();
			return;
		}

		const defaultTemplate = (DefaultTemplates as any)[name];
		const updatedTemplate = {
			...defaultTemplate,
			...template,
			isRuntime: true,
			isDefault: false
		};

		const isDifferent = updatedTemplate.System.text !== defaultTemplate.System.text ||
			updatedTemplate.User.text !== defaultTemplate.User.text;

		this.runtimePrompts[name] = {
			...updatedTemplate,
			isRuntime: isDifferent
		};

		await this.savePrompts();
	}

	getAllPrompts() {
		const defaultOrder = Object.keys(DefaultTemplates);
		const defaults = Object.entries(DefaultTemplates).map(([name, template]) => ({
			...template,
			name,
			isRuntime: false,
			isDefault: true
		}));

		const runtime = Object.entries(this.runtimePrompts).map(([name, template]) => {
			const defaultTemplate = (DefaultTemplates as any)[name];
			return {
				...template,
				name,
				isRuntime: true,
				isDefault: false,
				System: {
					...template.System,
					build: template.System.build || defaultTemplate.System.build
				},
				User: {
					...template.User,
					build: template.User.build || defaultTemplate.User.build
				}
			};
		});

		const prompts = [...runtime, ...defaults];

		const seen = new Set();
		const filtered = prompts.filter(p => {
			if (seen.has(p.name)) {
				return false;
			}
			seen.add(p.name);
			return true;
		});

		return filtered.sort((a, b) => {
			return defaultOrder.indexOf(a.name) - defaultOrder.indexOf(b.name);
		});
	}
}

export const usePromptManager = () => PromptManager.getInstance();
