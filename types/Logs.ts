export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	prefix: string;
	message: string;
	context?: Record<string, any>;
	environment: 'client' | 'server';
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'
