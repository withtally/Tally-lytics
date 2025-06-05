// services/cron/CronScheduler.ts
import { CronJob } from 'cron';
import { CronTask } from './CronTask';
import { Logger } from '../logging';
import { CronValidator } from '../validation/cronValidator';
import { DistributedLock } from './DistributedLock';

/**
 * Manages multiple cron tasks with a unified interface
 */
export class CronScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private tasks: Map<string, CronTask> = new Map();
  private isEnabled: boolean = false;
  private readonly MAX_RETRIES = parseInt(process.env.MAX_CRON_RETRIES || '3', 10);
  private readonly EXECUTION_TIMEOUT =
    parseInt(process.env.CRON_EXECUTION_TIMEOUT_MINUTES || '30', 10) * 60 * 1000;
  private readonly RETRY_DELAY =
    parseInt(process.env.CRON_RETRY_DELAY_MINUTES || '5', 10) * 60 * 1000;
  private readonly USE_DISTRIBUTED_LOCK = process.env.USE_DISTRIBUTED_CRON_LOCK !== 'false';

  private retryCount: Map<string, number> = new Map();
  private executionTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private activeLocks: Map<string, string> = new Map(); // taskName -> instanceId
  private heartbeatIntervals: Map<string, NodeJS.Timeout> = new Map();
  private distributedLock: DistributedLock;

  constructor(private readonly logger: Logger) {
    this.distributedLock = new DistributedLock(logger);
  }

  /**
   * Register a task with the scheduler
   */
  registerTask(task: CronTask, customSchedule?: string): void {
    if (this.tasks.has(task.name)) {
      throw new Error(`Task ${task.name} is already registered`);
    }

    const schedule = customSchedule || task.defaultSchedule;

    // Validate the schedule
    const validation = CronValidator.validate(schedule);
    if (!validation.isValid) {
      throw new Error(`Invalid cron schedule for task ${task.name}: ${validation.error}`);
    }

    this.tasks.set(task.name, task);
    this.retryCount.set(task.name, 0);

    this.logger.info(`Registered task: ${task.name} with schedule: ${schedule}`, {
      description: task.description,
    });
  }

  /**
   * Start all registered tasks
   */
  startAll(): void {
    if (this.isEnabled) {
      this.logger.warn('Scheduler is already running');
      return;
    }

    this.isEnabled = true;

    for (const [taskName, task] of this.tasks) {
      try {
        this.startTask(taskName, task.defaultSchedule);
      } catch (error) {
        this.logger.error(`Failed to start task ${taskName}`, error);
      }
    }

    this.logger.info(`Started ${this.jobs.size} cron tasks`);
  }

  /**
   * Start a specific task with optional custom schedule
   */
  startTask(taskName: string, customSchedule?: string): void {
    const task = this.tasks.get(taskName);
    if (!task) {
      throw new Error(`Task ${taskName} is not registered`);
    }

    // Stop existing job if running
    this.stopTask(taskName);

    const schedule = customSchedule || task.defaultSchedule;

    // Validate the schedule
    const validation = CronValidator.validate(schedule);
    if (!validation.isValid) {
      throw new Error(`Invalid cron schedule: ${validation.error}`);
    }

    const job = new CronJob(
      schedule,
      async () => {
        try {
          await this.executeTaskWithTimeout(taskName);
        } catch (error) {
          this.logger.error(`Uncaught error in task ${taskName}`, error);
        }
      },
      null,
      true,
      'UTC',
      null,
      true
    );

    this.jobs.set(taskName, job);
    this.retryCount.set(taskName, 0);

    this.logger.info(`Started task ${taskName} with schedule: ${schedule}`);
  }

  /**
   * Stop a specific task
   */
  stopTask(taskName: string): void {
    const job = this.jobs.get(taskName);
    if (job) {
      job.stop();
      this.jobs.delete(taskName);
    }

    // Clear any pending timeout
    const timeout = this.executionTimeouts.get(taskName);
    if (timeout) {
      clearTimeout(timeout);
      this.executionTimeouts.delete(taskName);
    }

    this.logger.info(`Stopped task ${taskName}`);
  }

  /**
   * Stop all tasks
   */
  stopAll(): void {
    for (const taskName of this.jobs.keys()) {
      this.stopTask(taskName);
    }

    this.isEnabled = false;
    this.logger.info('Stopped all cron tasks');
  }

  /**
   * Execute a task with timeout and retry logic
   */
  private async executeTaskWithTimeout(taskName: string): Promise<void> {
    const task = this.tasks.get(taskName);
    if (!task) {
      this.logger.error(`Task ${taskName} not found`);
      return;
    }

    // Try to acquire distributed lock if enabled
    let lockAcquired = false;
    let instanceId: string | undefined;

    if (this.USE_DISTRIBUTED_LOCK) {
      instanceId = this.generateInstanceId();
      lockAcquired = await this.distributedLock.acquireLock(`cron_task_${taskName}`, instanceId);
      
      if (!lockAcquired) {
        this.logger.info(`Task ${taskName} skipped - another instance is already running`);
        return;
      }

      this.activeLocks.set(taskName, instanceId);
      this.startHeartbeat(taskName, instanceId);
    }

    // Clear any existing timeout
    const existingTimeout = this.executionTimeouts.get(taskName);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    return new Promise<void>((resolve, reject) => {
      // Set execution timeout
      const timeout = setTimeout(() => {
        this.logger.error(`Task ${taskName} execution timeout reached`);
        this.handleExecutionFailure(taskName, 'Execution timeout');
        reject(new Error('Execution timeout'));
      }, this.EXECUTION_TIMEOUT);

      this.executionTimeouts.set(taskName, timeout);

      const executeTask = async () => {
        try {
          // Check if task can run
          if (task.canRun && !(await task.canRun())) {
            this.logger.info(`Task ${taskName} skipped - canRun() returned false`);
            resolve();
            return;
          }

          this.logger.info(`Executing task: ${taskName}`);
          await task.execute();

          // Reset retry count on successful execution
          this.retryCount.set(taskName, 0);
          this.logger.info(`Task ${taskName} completed successfully`);

          resolve();
        } catch (error: any) {
          this.logger.error(`Task ${taskName} failed`, error);
          this.handleExecutionFailure(
            taskName,
            error instanceof Error ? error.message : 'Unknown error'
          );
          reject(error);
        } finally {
          // Clear timeout
          clearTimeout(timeout);
          this.executionTimeouts.delete(taskName);

          // Release distributed lock if acquired
          if (lockAcquired && instanceId) {
            await this.releaseLock(taskName, instanceId);
          }
        }
      };

      executeTask();
    });
  }

  /**
   * Handle task execution failure with retry logic
   */
  private handleExecutionFailure(taskName: string, errorMessage: string): void {
    const currentRetryCount = this.retryCount.get(taskName) || 0;
    const newRetryCount = currentRetryCount + 1;

    this.retryCount.set(taskName, newRetryCount);

    if (newRetryCount >= this.MAX_RETRIES) {
      this.logger.error(
        `Task ${taskName} reached max retries (${this.MAX_RETRIES}). Disabling task. Error: ${errorMessage}`
      );
      this.stopTask(taskName);
    } else {
      this.logger.warn(
        `Task ${taskName} scheduling retry ${newRetryCount} of ${this.MAX_RETRIES} in ${this.RETRY_DELAY / 1000} seconds`
      );
      setTimeout(() => {
        if (this.tasks.has(taskName)) {
          this.executeTaskWithTimeout(taskName);
        }
      }, this.RETRY_DELAY);
    }
  }

  /**
   * Get status of all tasks
   */
  async getStatus(): Promise<Record<string, any>> {
    const taskStatuses: Record<string, any> = {};

    for (const [taskName, task] of this.tasks) {
      const job = this.jobs.get(taskName);
      const retryCount = this.retryCount.get(taskName) || 0;
      const isExecuting = this.executionTimeouts.has(taskName);

      taskStatuses[taskName] = {
        name: taskName,
        description: task.description,
        isRunning: job?.running || false,
        nextRun: job ? job.nextDate().toISOString() : null,
        retryCount,
        maxRetries: this.MAX_RETRIES,
        isExecuting,
        schedule: task.defaultSchedule,
      };

      // Get task-specific status if available
      if (task.getStatus) {
        try {
          const taskStatus = await task.getStatus();
          taskStatuses[taskName].taskStatus = taskStatus;
        } catch (error) {
          taskStatuses[taskName].taskStatus = { error: 'Failed to get status' };
        }
      }
    }

    return {
      enabled: this.isEnabled,
      tasks: taskStatuses,
      totalTasks: this.tasks.size,
      runningTasks: Array.from(this.jobs.values()).filter(job => job.running).length,
    };
  }

  /**
   * Manually execute a task (outside of schedule)
   */
  async executeTaskNow(taskName: string): Promise<void> {
    const task = this.tasks.get(taskName);
    if (!task) {
      throw new Error(`Task ${taskName} is not registered`);
    }

    this.logger.info(`Manually executing task: ${taskName}`);
    await this.executeTaskWithTimeout(taskName);
  }

  /**
   * Get list of registered task names
   */
  getRegisteredTasks(): string[] {
    return Array.from(this.tasks.keys());
  }

  /**
   * Generate a unique instance ID for this process
   */
  private generateInstanceId(): string {
    const hostname = process.env.HOSTNAME || process.env.RAILWAY_REPLICA_ID || 'unknown';
    const pid = process.pid;
    const timestamp = Date.now();
    return `${hostname}-${pid}-${timestamp}`;
  }

  /**
   * Start heartbeat for a locked task
   */
  private startHeartbeat(taskName: string, instanceId: string): void {
    // Update heartbeat every 2 minutes (lock timeout is typically 30 minutes)
    const heartbeatInterval = setInterval(async () => {
      const success = await this.distributedLock.updateHeartbeat(`cron_task_${taskName}`, instanceId);
      if (!success) {
        this.logger.warn(`Failed to update heartbeat for task ${taskName}`, { instanceId });
        this.stopHeartbeat(taskName);
      }
    }, 2 * 60 * 1000);

    this.heartbeatIntervals.set(taskName, heartbeatInterval);
  }

  /**
   * Stop heartbeat for a task
   */
  private stopHeartbeat(taskName: string): void {
    const interval = this.heartbeatIntervals.get(taskName);
    if (interval) {
      clearInterval(interval);
      this.heartbeatIntervals.delete(taskName);
    }
  }

  /**
   * Release lock for a task
   */
  private async releaseLock(taskName: string, instanceId: string): Promise<void> {
    this.stopHeartbeat(taskName);
    await this.distributedLock.releaseLock(`cron_task_${taskName}`, instanceId);
    this.activeLocks.delete(taskName);
  }

  /**
   * Get distributed lock status for monitoring
   */
  async getLockStatus(): Promise<any[]> {
    if (!this.USE_DISTRIBUTED_LOCK) {
      return [];
    }
    return await this.distributedLock.getAllLocks();
  }

  /**
   * Force release all locks (emergency use only)
   */
  async forceReleaseAllLocks(): Promise<number> {
    if (!this.USE_DISTRIBUTED_LOCK) {
      return 0;
    }

    // Stop all heartbeats
    for (const taskName of this.heartbeatIntervals.keys()) {
      this.stopHeartbeat(taskName);
    }
    this.activeLocks.clear();

    return await this.distributedLock.forceReleaseAllLocks();
  }

  /**
   * Cleanup method to call on shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down cron scheduler...');
    
    // Stop all tasks
    this.stopAll();
    
    // Release all locks
    for (const [taskName, instanceId] of this.activeLocks) {
      await this.releaseLock(taskName, instanceId);
    }
    
    // Stop the distributed lock cleanup process
    this.distributedLock.stopCleanupProcess();
    
    this.logger.info('Cron scheduler shutdown complete');
  }
}
