import { LogEntry } from '~/types/Logs'

export default defineEventHandler(async (event) => {
	const storage = useStorage()
	const logs = await storage.getItem('server-logs') as LogEntry[] || []

	// Add query parameters for filtering
	const query = getQuery(event)

	let filteredLogs = logs

	if (query.level) {
		filteredLogs = filteredLogs.filter(log => log.level === query.level)
	}

	if (query.from) {
		filteredLogs = filteredLogs.filter(log =>
			new Date(log.timestamp) >= new Date(query.from as string)
		)
	}

	return filteredLogs
})
