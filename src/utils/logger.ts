import { LogEntry } from "../types";

export class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private enableConsole = process.env.NODE_ENV === "development";

  info(message: string, data?: any): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: any): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: any): void {
    this.log("error", message, data);
  }

  private log(
    level: "info" | "warn" | "error",
    message: string,
    data?: any
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output in development
    if (this.enableConsole) {
      const logMethod = console[level] || console.log;
      logMethod(`[OfflineSync] ${message}`, data || "");
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}
