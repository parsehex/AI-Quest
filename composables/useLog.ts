import { useLogManager } from '~/server/utils/LogManager'
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

const formatTimestamp = (date: Date): string => {
	const pad = (n: number, width = 2) => String(n).padStart(width, '0')

	return `${pad(date.getMonth() + 1)}/${pad(date.getDate())} ` +
		`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.` +
		`${pad(date.getMilliseconds(), 3)}`
}

export const useLog = (prefix = 'App', options: LoggerOptions = {}) => {
	const currentLevel = options.level || 'info'
	const isServer = import.meta.server
	const defaultContext = options.context || {}

	const shouldLog = (messageLevel: LogLevel): boolean => {
		return LOG_LEVELS[messageLevel] >= LOG_LEVELS[currentLevel]
	}

	const formatMessage = (message: any, level: string) => {
		const timestamp = formatTimestamp(new Date())
		const arr = [`[${timestamp}]`, `[${prefix}]`, `[${level}]`]
		arr.push(...message)
		return arr
	}

	const saveLog = async (entry: LogEntry) => {
		if (!isServer) return

		try {
			// TODO if not server, save in memory to view in client
			const logManager = useLogManager()
			await logManager.waitForInit()
			logManager.addLog(entry)
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
		timestamp: formatTimestamp(new Date()),
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
		saveLog(entry)
		if (shouldLog('error')) {
			console.error(...formatMessage(messages, 'ERROR'))
		}
	}

	const warn = async (...args: any[]) => {
		const { messages, context } = processArgs(args)
		const entry = createLogEntry('warn', messages, context)
		saveLog(entry)
		if (shouldLog('warn')) {
			console.warn(...formatMessage(messages, 'WARN'))
		}
	}

	const info = async (...args: any[]) => {
		const { messages, context } = processArgs(args)
		const entry = createLogEntry('info', messages, context)
		saveLog(entry)
		if (shouldLog('info')) {
			console.info(...formatMessage(messages, 'INFO'))
		}
	}

	const debug = async (...args: any[]) => {
		const { messages, context } = processArgs(args)
		const entry = createLogEntry('debug', messages, context)
		saveLog(entry)
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
