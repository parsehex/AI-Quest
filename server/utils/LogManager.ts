import { debounce } from 'perfect-debounce'
import { LogEntry } from '~/types/Logs'

export class LogManager {
	private static instance: LogManager
	private logs: LogEntry[] = []
	private storage = useStorage()
	private initialized = false

	private constructor() {
		this.loadLogs()

		// Set up debounced save
		this.saveToDisk = debounce(async () => {
			try {
				await this.storage.setItem('server-logs:logs.json', this.logs)
			} catch (e) {
				console.error('Failed to save logs to disk:', e)
			}
		}, 1000) // 1 second debounce
	}

	private async loadLogs() {
		try {
			const savedLogs = await this.storage.getItem('server-logs:logs.json')
			this.logs = Array.isArray(savedLogs) ? savedLogs : []
			this.initialized = true
		} catch (e) {
			console.error('Failed to load logs:', e)
			this.logs = []
			this.initialized = true
		}
	}

	private saveToDisk: () => Promise<void>

	static getInstance(): LogManager {
		if (!LogManager.instance) {
			LogManager.instance = new LogManager()
		}
		return LogManager.instance
	}

	async waitForInit(): Promise<void> {
		if (this.initialized) return
		await new Promise(resolve => {
			const check = () => {
				if (this.initialized) resolve(undefined)
				else setTimeout(check, 10)
			}
			check()
		})
	}

	addLog(entry: LogEntry): void {
		this.logs.push(entry)
		this.saveToDisk()
	}

	getLogs(): LogEntry[] {
		return this.logs
	}
}

// Create and export a instance getter
export const useLogManager = () => {
	return LogManager.getInstance()
}
