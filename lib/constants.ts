export const STARTER_PREMISES = [
	'A bank robbery gone supernatural',
	'Dragon heist in a modern metropolis',
	'stupid bakery robbery during a blood moon',
	'Exploring a forgotten city beneath the waves',
	'Time-traveling train hijacking',
]

export const STARTER_NAMES = [
	'George Washington',
	'Dave',
	'Trengar',
];

export const CHARACTER_OPTIONS = {
	classes: ['', 'Warrior', 'Mage', 'Rogue', 'Cleric', 'Ranger'],
	backgrounds: ['', 'Noble', 'Merchant', 'Criminal', 'Soldier', 'Scholar']
};

export const MODEL_MAP = {
	dev: {
		fast: ['http://127.0.0.1:11434/v1/', 'llama3.2:3b-instruct-q6_K'],
		good: ['http://127.0.0.1:11434/v1/', 'qwen2.5:latest']
	},
	prod: {
		fast: ['https://openrouter.ai/api/v1', 'meta-llama/llama-3.1-8b-instruct:free'],
		good: ['https://openrouter.ai/api/v1', 'meta-llama/llama-3.1-70b-instruct:free']
	}
};
