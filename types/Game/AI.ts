export interface ModelConfig {
	dev: {
		fast: [string, string];
		good: [string, string];
	};
	prod: {
		fast: [string, string];
		good: [string, string];
	};
	[key: string]: any;
}
