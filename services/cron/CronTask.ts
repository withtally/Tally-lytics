// services/cron/CronTask.ts

/**
 * Interface for cron tasks that can be scheduled and executed
 */
export interface CronTask {
  /** Unique name identifier for the task */
  name: string;

  /** Human-readable description of what this task does */
  description: string;

  /** Default cron schedule for this task */
  defaultSchedule: string;

  /** Execute the task */
  execute(): Promise<void>;

  /** Optional: Check if the task can run (e.g., dependencies are available) */
  canRun?(): Promise<boolean>;

  /** Optional: Get current status or progress information */
  getStatus?(): Promise<Record<string, any>>;
}

/**
 * Abstract base class for cron tasks with common functionality
 */
export abstract class BaseCronTask implements CronTask {
  abstract name: string;
  abstract description: string;
  abstract defaultSchedule: string;

  protected constructor(protected readonly logger: any) {}

  abstract execute(): Promise<void>;

  async canRun(): Promise<boolean> {
    return true; // Default implementation - can always run
  }

  async getStatus(): Promise<Record<string, any>> {
    return {}; // Default implementation - no status
  }

  protected logInfo(message: string, extra?: any): void {
    this.logger.info(`[${this.name}] ${message}`, extra);
  }

  protected logError(message: string, error?: any): void {
    this.logger.error(`[${this.name}] ${message}`, error);
  }

  protected logWarn(message: string, extra?: any): void {
    this.logger.warn(`[${this.name}] ${message}`, extra);
  }
}
