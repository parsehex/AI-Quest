export default defineEventHandler(async (event) => {
	const hash = event.context.params?.hash;
	if (!hash) {
		throw createError({
			statusCode: 400,
			message: 'Missing hash parameter'
		});
	}

	const storage = useStorage('tts');
	const audio = await storage.getItemRaw(hash + '.wav');

	if (!audio) {
		throw createError({
			statusCode: 404,
			message: 'Audio not found'
		});
	}

	// Set headers for audio streaming
	setHeader(event, 'Content-Type', 'audio/wav');
	setHeader(event, 'Accept-Ranges', 'bytes');
	setHeader(event, 'Cache-Control', 'public, max-age=31536000');

	return Buffer.from(audio);
});
