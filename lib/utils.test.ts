import { expect, test } from 'vitest'
import { extractOutput } from './utils';

test('extracts content between <output> tags', () => {
	const output = `<output>
Lorem Ipsum: A Test
</output>`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe('Lorem Ipsum: A Test');
});

test('extracts content between <output> tags, with broken tag', () => {
	const output = `output>
Lorem Ipsum: A Test
</output>`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe('Lorem Ipsum: A Test');
});

test('extracts content between <output> tags, without end tag', () => {
	const output = `<output>
Lorem Ipsum: A Test`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe('Lorem Ipsum: A Test');
});

test('extracts content between <output> tags, with any whitespace', () => {
	const output = `<output> Lorem Ipsum: A Test
</output>`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe('Lorem Ipsum: A Test');
});

test('extracts content between <output> tags, removing quotes', () => {
	const output = `<output>
	"Lorem Ipsum: A Test"
	</output>`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe('Lorem Ipsum: A Test');
});

test('extracts content without <output> tags', () => {
	const outputWithQuotes = `"Lorem Ipsum: A Test"`;
	const extractedOutputQuotes = extractOutput(outputWithQuotes);
	expect(extractedOutputQuotes).toBe('Lorem Ipsum: A Test');

	const output = `Lorem Ipsum: A Test`;
	const extractedOutput = extractOutput(output);
	expect(extractedOutput).toBe('Lorem Ipsum: A Test');
});
