type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LoggerOptions {
	level?: LogLevel
}

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
}

export const useLog = (prefix = 'App', options: LoggerOptions = {}) => {
	const currentLevel = options.level || 'info'

	const shouldLog = (messageLevel: LogLevel): boolean => {
		return LOG_LEVELS[messageLevel] >= LOG_LEVELS[currentLevel]
	}

	const formatMessage = (message: any, level: string) => {
		const timestamp = new Date().toISOString()
		const arr = [`[${timestamp}]`, `[${prefix}]`, `[${level}]`]
		arr.push(...message)
		return arr
	}

	const debug = (...args: any[]) => {
		if (shouldLog('debug')) {
			console.debug(...formatMessage(args, 'DEBUG'))
		}
	}

	const info = (...args: any[]) => {
		if (shouldLog('info')) {
			console.info(...formatMessage(args, 'INFO'))
		}
	}

	const warn = (...args: any[]) => {
		if (shouldLog('warn')) {
			console.warn(...formatMessage(args, 'WARN'))
		}
	}

	const error = (...args: any[]) => {
		if (shouldLog('error')) {
			console.error(...formatMessage(args, 'ERROR'))
		}
	}

	return {
		debug,
		info,
		warn,
		error,
		log: debug
	}
}
