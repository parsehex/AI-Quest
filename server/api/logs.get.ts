import { useLogManager } from '../utils/LogManager'

export default defineEventHandler(async (event) => {
	const logManager = useLogManager()
	await logManager.waitForInit()

	const logs = logManager.getLogs()
	const query = getQuery(event)

	return logs.filter(log => {
		if (query.level && log.level !== query.level) return false
		if (query.from && new Date(log.timestamp) < new Date(query.from as string)) return false
		return true
	})
})
