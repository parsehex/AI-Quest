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

export function extractOutput(llmResponse: string): string {
	const startTag = '<output>';
	const endTag = '</output>';

	let startIndex = llmResponse.indexOf(startTag);
	if (startIndex === -1) {
		// is there a "output>" on the first line?
		const firstLine = llmResponse.split('\n')[0];
		if (firstLine.includes('output>')) {
			// replace first line with the output tag
			const newLines = llmResponse.split('\n').slice(1);
			llmResponse = startTag + '\n' + newLines.join('\n');
			startIndex = llmResponse.indexOf(startTag);
			console.log('partial tag\n', llmResponse, '--');
		} else {
			return llmResponse;
		}
	}

	const contentStart = startIndex + startTag.length;
	const endIndex = llmResponse.indexOf(endTag, contentStart);

	if (endIndex === -1) {
		return llmResponse.substring(contentStart).trim();
	}

	return llmResponse.substring(contentStart, endIndex).trim();
}
