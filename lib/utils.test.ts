import { expect, test } from 'vitest'
import { extractOutput } from './utils';

const expected = 'Lorem Ipsum: A Test';

test('extracts content between <output> tags', () => {
	const output = `<output>
Lorem Ipsum: A Test
</output>`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe(expected);
});

test('extracts content between <output> tags, with broken tags', () => {
	const cutOffOutput = `output>
${expected}
</output>`;
	const extractedCutOffOutput = extractOutput(cutOffOutput);
	expect(extractedCutOffOutput).toBe(expected);

	const closingOutput = `</output>
${expected}`;
	const extractedClosingOutput = extractOutput(closingOutput);
	expect(extractedClosingOutput).toBe(expected);
});

test('extracts content between <output> tags, without end tag', () => {
	const output = `<output>
${expected}`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe(expected);
});

test('extracts content between <output> tags, with any whitespace', () => {
	const output = `<output> ${expected}
</output>`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe(expected);
});

test('extracts content between <output> tags, removing quotes', () => {
	const output = `<output>
	"${expected}"
	</output>`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe(expected);
});

test('extracts content without <output> tags', () => {
	const outputWithQuotes = `"${expected}"`;
	const extractedOutputQuotes = extractOutput(outputWithQuotes);
	expect(extractedOutputQuotes).toBe(expected);

	const output = `${expected}`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe(expected);
});
