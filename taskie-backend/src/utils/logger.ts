export class Logger {
  private context: string;

  constructor(context?: string) {
    this.context = context || 'App';
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;
  }

  info(message: string): void {
    console.info(this.formatMessage('info', message));
  }

  warn(message: string): void {
    console.warn(this.formatMessage('warn', message));
  }

  error(message: string, error?: any) {
    console.error(message, error);
  }

  debug(message: string): void {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(this.formatMessage('debug', message));
    }
  }

  setContext(context: string): void {
    this.context = context;
  }
}
