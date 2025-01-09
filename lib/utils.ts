export function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function deepAssign(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
	for (const key in source) {
		if (source[key] instanceof Object) {
			Object.assign(source[key], deepAssign(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>));
		}
	}
	return Object.assign(target || {}, source);
}
