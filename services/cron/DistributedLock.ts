// services/cron/DistributedLock.ts
import db from '../../db/db';
import { Logger } from '../logging';

/**
 * Database-based distributed lock implementation for preventing concurrent cron executions
 */
export class DistributedLock {
  private readonly lockTimeoutMs: number;
  private readonly cleanupIntervalMs: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private readonly logger: Logger,
    lockTimeoutMinutes: number = 30,
    cleanupIntervalMinutes: number = 5
  ) {
    this.lockTimeoutMs = lockTimeoutMinutes * 60 * 1000;
    this.cleanupIntervalMs = cleanupIntervalMinutes * 60 * 1000;
    this.startCleanupProcess();
  }

  /**
   * Attempt to acquire a lock for a specific resource
   * @param lockName Unique identifier for the lock
   * @param instanceId Unique identifier for this instance (optional)
   * @returns Promise<boolean> true if lock was acquired, false otherwise
   */
  async acquireLock(lockName: string, instanceId?: string): Promise<boolean> {
    const actualInstanceId = instanceId || this.generateInstanceId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.lockTimeoutMs);

    try {
      // First, try to clean up any expired locks
      await this.cleanupExpiredLocks(lockName);

      // Try to insert a new lock
      const result = await db('cron_locks')
        .insert({
          lock_name: lockName,
          instance_id: actualInstanceId,
          acquired_at: now,
          expires_at: expiresAt,
          heartbeat_at: now
        })
        .onConflict('lock_name')
        .ignore();

      if (result.length > 0) {
        this.logger.info(`Lock acquired: ${lockName}`, { instanceId: actualInstanceId });
        return true;
      }

      // If insert failed, check if we already own this lock
      const existingLock = await db('cron_locks')
        .where({ lock_name: lockName, instance_id: actualInstanceId })
        .first();

      if (existingLock) {
        // We already own this lock, update the heartbeat
        await this.updateHeartbeat(lockName, actualInstanceId);
        this.logger.debug(`Lock refreshed: ${lockName}`, { instanceId: actualInstanceId });
        return true;
      }

      this.logger.debug(`Lock acquisition failed: ${lockName}`, { instanceId: actualInstanceId });
      return false;
    } catch (error) {
      this.logger.error(`Error acquiring lock ${lockName}:`, error);
      return false;
    }
  }

  /**
   * Release a lock
   * @param lockName Unique identifier for the lock
   * @param instanceId Unique identifier for this instance (optional)
   */
  async releaseLock(lockName: string, instanceId?: string): Promise<void> {
    const actualInstanceId = instanceId || this.generateInstanceId();

    try {
      const deleted = await db('cron_locks')
        .where({ lock_name: lockName, instance_id: actualInstanceId })
        .del();

      if (deleted > 0) {
        this.logger.info(`Lock released: ${lockName}`, { instanceId: actualInstanceId });
      } else {
        this.logger.warn(`Lock not found for release: ${lockName}`, { instanceId: actualInstanceId });
      }
    } catch (error) {
      this.logger.error(`Error releasing lock ${lockName}:`, error);
    }
  }

  /**
   * Update heartbeat for a lock to keep it alive
   * @param lockName Unique identifier for the lock
   * @param instanceId Unique identifier for this instance (optional)
   */
  async updateHeartbeat(lockName: string, instanceId?: string): Promise<boolean> {
    const actualInstanceId = instanceId || this.generateInstanceId();

    try {
      const updated = await db('cron_locks')
        .where({ lock_name: lockName, instance_id: actualInstanceId })
        .update({ 
          heartbeat_at: new Date(),
          expires_at: new Date(Date.now() + this.lockTimeoutMs)
        });

      return updated > 0;
    } catch (error) {
      this.logger.error(`Error updating heartbeat for lock ${lockName}:`, error);
      return false;
    }
  }

  /**
   * Check if a lock is currently held
   * @param lockName Unique identifier for the lock
   * @returns Promise<boolean> true if lock is held, false otherwise
   */
  async isLocked(lockName: string): Promise<boolean> {
    try {
      // Clean up expired locks first
      await this.cleanupExpiredLocks(lockName);

      const lock = await db('cron_locks')
        .where({ lock_name: lockName })
        .first();

      return !!lock;
    } catch (error) {
      this.logger.error(`Error checking lock status ${lockName}:`, error);
      return false; // Assume not locked on error
    }
  }

  /**
   * Get information about a specific lock
   * @param lockName Unique identifier for the lock
   */
  async getLockInfo(lockName: string): Promise<any | null> {
    try {
      return await db('cron_locks')
        .where({ lock_name: lockName })
        .first();
    } catch (error) {
      this.logger.error(`Error getting lock info ${lockName}:`, error);
      return null;
    }
  }

  /**
   * Clean up expired locks for a specific lock name
   * @param lockName Optional specific lock name to clean up
   */
  private async cleanupExpiredLocks(lockName?: string): Promise<void> {
    try {
      const query = db('cron_locks')
        .where('expires_at', '<', new Date());

      if (lockName) {
        query.andWhere('lock_name', lockName);
      }

      const deleted = await query.del();

      if (deleted > 0) {
        this.logger.debug(`Cleaned up ${deleted} expired locks`, { lockName });
      }
    } catch (error) {
      this.logger.error('Error cleaning up expired locks:', error);
    }
  }

  /**
   * Start the background cleanup process
   */
  private startCleanupProcess(): void {
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredLocks();
    }, this.cleanupIntervalMs);

    this.logger.info('Distributed lock cleanup process started', {
      cleanupIntervalMinutes: this.cleanupIntervalMs / 60000
    });
  }

  /**
   * Stop the background cleanup process
   */
  stopCleanupProcess(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
      this.logger.info('Distributed lock cleanup process stopped');
    }
  }

  /**
   * Generate a unique instance ID for this process
   */
  private generateInstanceId(): string {
    const hostname = process.env.HOSTNAME || 'unknown';
    const pid = process.pid;
    const timestamp = Date.now();
    return `${hostname}-${pid}-${timestamp}`;
  }

  /**
   * Get all active locks (for debugging/monitoring)
   */
  async getAllLocks(): Promise<any[]> {
    try {
      await this.cleanupExpiredLocks();
      return await db('cron_locks').select('*');
    } catch (error) {
      this.logger.error('Error getting all locks:', error);
      return [];
    }
  }

  /**
   * Force release all locks (emergency use only)
   */
  async forceReleaseAllLocks(): Promise<number> {
    try {
      const deleted = await db('cron_locks').del();
      this.logger.warn(`Force released ${deleted} locks`);
      return deleted;
    } catch (error) {
      this.logger.error('Error force releasing all locks:', error);
      return 0;
    }
  }
}