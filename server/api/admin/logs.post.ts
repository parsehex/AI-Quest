import { useLogManager } from '../../utils/LogManager'

export default defineEventHandler(async (event) => {
	const logManager = useLogManager()
	await logManager.waitForInit()
	const config = useRuntimeConfig()

	const logs = logManager.getLogs()
	const body = await readBody(event)

	const pw = body.password
	if (pw !== config.private.adminPassword) {
		console.log(config);
		throw createError({
			statusCode: 401,
			message: 'invalid password'
		});
	}

	return logs.filter(log => {
		if (body.level && log.level !== body.level) return false
		if (body.from && new Date(log.timestamp) < new Date(body.from as string)) return false
		if (body.roomId && (!log.context?.roomId || log.context.roomId !== body.roomId)) return false
		return true
	})
})
