// services/cron/__tests__/cronIntegration.simple.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CronScheduler } from '../CronScheduler';
import { BaseCronTask } from '../CronTask';
import { Logger } from '../../logging';

// Mock logger for testing
const mockLogger: Logger = {
  info: () => {},
  debug: () => {},
  warn: () => {},
  error: () => {},
} as any;

// Simple test task
class TestTask extends BaseCronTask {
  name = 'test_task';
  description = 'A test task for integration testing';
  defaultSchedule = '0 0 * * *'; // Daily
  
  public executionCount = 0;
  public shouldFail = false;
  public shouldNotRun = false;

  constructor() {
    super(mockLogger);
  }

  async execute(): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Test task intentionally failed');
    }
    this.executionCount++;
    this.logInfo('Test task executed successfully');
  }

  async canRun(): Promise<boolean> {
    return !this.shouldNotRun;
  }

  async getStatus(): Promise<Record<string, any>> {
    return {
      executionCount: this.executionCount,
      shouldFail: this.shouldFail,
      shouldNotRun: this.shouldNotRun,
    };
  }
}

describe('Cron Integration Tests', () => {
  let cronScheduler: CronScheduler;
  let testTask: TestTask;

  beforeEach(() => {
    // Disable distributed locking for these tests
    process.env.USE_DISTRIBUTED_CRON_LOCK = 'false';
    
    cronScheduler = new CronScheduler(mockLogger);
    testTask = new TestTask();
  });

  afterEach(async () => {
    await cronScheduler.shutdown();
    delete process.env.USE_DISTRIBUTED_CRON_LOCK;
  });

  describe('Task Registration', () => {
    it('should register a task successfully', () => {
      expect(() => {
        cronScheduler.registerTask(testTask);
      }).not.toThrow();

      const registeredTasks = cronScheduler.getRegisteredTasks();
      expect(registeredTasks).toContain('test_task');
    });

    it('should reject duplicate task registration', () => {
      cronScheduler.registerTask(testTask);
      
      expect(() => {
        cronScheduler.registerTask(testTask);
      }).toThrow('Task test_task is already registered');
    });

    it('should reject invalid cron schedule', () => {
      expect(() => {
        cronScheduler.registerTask(testTask, 'invalid schedule');
      }).toThrow('Invalid cron schedule');
    });
  });

  describe('Task Execution', () => {
    beforeEach(() => {
      cronScheduler.registerTask(testTask);
    });

    it('should execute task manually', async () => {
      expect(testTask.executionCount).toBe(0);
      
      await cronScheduler.executeTaskNow('test_task');
      
      expect(testTask.executionCount).toBe(1);
    });

    it('should skip task when canRun returns false', async () => {
      testTask.shouldNotRun = true;
      
      await cronScheduler.executeTaskNow('test_task');
      
      expect(testTask.executionCount).toBe(0);
    });

    it('should handle task execution failure', async () => {
      testTask.shouldFail = true;
      
      try {
        await cronScheduler.executeTaskNow('test_task');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Test task intentionally failed');
      }
      
      expect(testTask.executionCount).toBe(0);
    });
  });

  describe('Task Status', () => {
    beforeEach(() => {
      cronScheduler.registerTask(testTask);
    });

    it('should return task status', async () => {
      const status = await cronScheduler.getStatus();
      
      expect(status.enabled).toBe(false); // Not started yet
      expect(status.totalTasks).toBe(1);
      expect(status.tasks['test_task']).toBeDefined();
      expect(status.tasks['test_task'].name).toBe('test_task');
      expect(status.tasks['test_task'].description).toBe('A test task for integration testing');
    });

    it('should include task-specific status', async () => {
      const status = await cronScheduler.getStatus();
      
      expect(status.tasks['test_task'].taskStatus).toBeDefined();
      expect(status.tasks['test_task'].taskStatus.executionCount).toBe(0);
    });
  });

  describe('Task Management', () => {
    beforeEach(() => {
      cronScheduler.registerTask(testTask);
    });

    it('should start and stop specific task', () => {
      expect(() => {
        cronScheduler.startTask('test_task');
      }).not.toThrow();

      expect(() => {
        cronScheduler.stopTask('test_task');
      }).not.toThrow();
    });

    it('should start and stop all tasks', () => {
      expect(() => {
        cronScheduler.startAll();
      }).not.toThrow();

      expect(() => {
        cronScheduler.stopAll();
      }).not.toThrow();
    });

    it('should handle starting non-existent task', () => {
      expect(() => {
        cronScheduler.startTask('non_existent_task');
      }).toThrow('Task non_existent_task is not registered');
    });
  });

  describe('Schedule Validation', () => {
    it('should accept valid cron schedules', () => {
      const validSchedules = [
        '0 0 * * *', // Daily at midnight
        '*/5 * * * *', // Every 5 minutes
        '0 */2 * * *', // Every 2 hours
        '0 0 1 * *', // Monthly on 1st
      ];

      validSchedules.forEach((schedule, index) => {
        const task = new TestTask();
        task.name = `test_task_${index}`;
        expect(() => {
          cronScheduler.registerTask(task, schedule);
        }).not.toThrow();
      });
    });

    it('should reject invalid cron schedules', () => {
      const invalidSchedules = [
        'invalid',
        '60 * * * *', // Invalid minute
        '* 25 * * *', // Invalid hour
        '* * 32 * *', // Invalid day
      ];

      invalidSchedules.forEach((schedule, index) => {
        const task = new TestTask();
        task.name = `invalid_task_${index}`;
        expect(() => {
          cronScheduler.registerTask(task, schedule);
        }).toThrow();
      });
    });
  });
});