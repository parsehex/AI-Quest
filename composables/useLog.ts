import type { LogLevel } from '~/types/Logs'

interface LoggerOptions {
	level?: LogLevel
}

const LOG_LEVELS: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3
}

interface LogEntry {
	timestamp: string
	level: LogLevel
	prefix: string
	message: string
	context?: Record<string, any>
	environment: 'client' | 'server'
}

interface LoggerOptions {
	level?: LogLevel
	context?: Record<string, any> // Default context for all logs from this instance
}

export const useLog = (prefix = 'App', options: LoggerOptions = {}) => {
	const currentLevel = options.level || 'info'
	const isServer = process.server
	const defaultContext = options.context || {}

	const shouldLog = (messageLevel: LogLevel): boolean => {
		return LOG_LEVELS[messageLevel] >= LOG_LEVELS[currentLevel]
	}

	const formatMessage = (message: any, level: string) => {
		const timestamp = new Date().toISOString()
		const arr = [`[${timestamp}]`, `[${prefix}]`, `[${level}]`]
		arr.push(...message)
		return arr
	}

	// Helper to save logs on server
	const saveLog = async (entry: LogEntry) => {
		if (!isServer) return

		try {
			const storage = useStorage()
			let logs = await storage.getItem('server-logs:logs.json') as LogEntry[]
			if (!logs) logs = []
			else if (typeof logs === 'string') logs = JSON.parse(logs)
			logs.push(entry)

			// if (logs.length > 1000) logs.shift()

			await storage.setItem('server-logs:logs.json', logs)
		} catch (e) {
			console.error('Failed to save log:', e)
		}
	}

	// Helper to process args and extract context
	const processArgs = (args: any[]): {
		messages: any[],
		context: Record<string, any>
	} => {
		// If first arg is an object and has a special _context property, use it as context
		const firstArg = args[0]
		if (firstArg && typeof firstArg === 'object' && '_context' in firstArg) {
			return {
				messages: args.slice(1),
				context: { ...defaultContext, ...firstArg._context }
			}
		}

		return {
			messages: args,
			context: defaultContext
		}
	}

	const createLogEntry = (
		level: LogLevel,
		messages: any[],
		context: Record<string, any>
	): LogEntry => ({
		timestamp: new Date().toISOString(),
		level,
		prefix,
		message: messages.map(arg =>
			typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
		).join(' '),
		context: Object.keys(context).length > 0 ? context : undefined,
		environment: isServer ? 'server' : 'client'
	})

	const error = async (...args: any[]) => {
		const { messages, context } = processArgs(args)
		const entry = createLogEntry('error', messages, context)
		await saveLog(entry)
		if (shouldLog('error')) {
			console.error(...formatMessage(messages, 'ERROR'))
		}
	}

	const warn = async (...args: any[]) => {
		const { messages, context } = processArgs(args)
		const entry = createLogEntry('warn', messages, context)
		await saveLog(entry)
		if (shouldLog('warn')) {
			console.warn(...formatMessage(messages, 'WARN'))
		}
	}

	const info = async (...args: any[]) => {
		const { messages, context } = processArgs(args)
		const entry = createLogEntry('info', messages, context)
		await saveLog(entry)
		if (shouldLog('info')) {
			console.info(...formatMessage(messages, 'INFO'))
		}
	}

	const debug = async (...args: any[]) => {
		const { messages, context } = processArgs(args)
		const entry = createLogEntry('debug', messages, context)
		await saveLog(entry)
		if (shouldLog('debug')) {
			console.debug(...formatMessage(messages, 'DEBUG'))
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
