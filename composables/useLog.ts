import { ref } from 'vue'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
interface LogEntry {
	timestamp: Date
	level: LogLevel
	args: any[]
}

export function useLog(componentName?: string) {
	const logs = ref<LogEntry[]>([])
	const maxLogs = 100

	const addLog = (level: LogLevel, ...args: any[]) => {
		// Add component name prefix to first argument if it's a string
		if (componentName && typeof args[0] === 'string') {
			args[0] = `[${componentName}] ${args[0]}`
		}

		const entry: LogEntry = {
			timestamp: new Date(),
			level,
			args
		}

		logs.value.unshift(entry)
		if (logs.value.length > maxLogs) {
			logs.value.pop()
		}

		// Use spread operator to pass args to console
		console[level](...args)
	}

	return {
		logs,
		debug: (...args: any[]) => addLog('debug', ...args),
		info: (...args: any[]) => addLog('info', ...args),
		warn: (...args: any[]) => addLog('warn', ...args),
		error: (...args: any[]) => addLog('error', ...args),
		clear: () => logs.value = []
	}
}
