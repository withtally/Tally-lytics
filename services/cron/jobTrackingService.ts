import db from '../../db/db';
import { Logger } from '../logging';

const logger = new Logger({
  logFile: 'logs/job-tracking.log',
  level: 'info',
});

export interface JobRecord {
  id: number;
  job_name: string;
  status: 'running' | 'success' | 'failed';
  message?: string;
  started_at: Date;
  completed_at?: Date;
  duration_ms?: number;
}

export class JobTrackingService {
  /**
   * Records the start of a job execution
   * @param jobName Unique identifier for the job
   * @returns The job record ID
   */
  async recordJobStart(jobName: string): Promise<number> {
    try {
      const [record] = await db('cron_job_history')
        .insert({
          job_name: jobName,
          status: 'running',
          started_at: new Date()
        })
        .returning('id');
      
      logger.info(`Job started: ${jobName}, ID: ${record.id}`);
      return record.id;
    } catch (error) {
      logger.error(`Failed to record job start for ${jobName}:`, error as Error);
      // Return -1 to indicate failure but allow the job to continue
      return -1;
    }
  }

  /**
   * Records the completion of a job
   * @param jobId The job record ID
   * @param status The final status of the job
   * @param message Optional message with details about the job result
   */
  async recordJobCompletion(jobId: number, status: 'success' | 'failed', message?: string): Promise<void> {
    // Skip if job tracking failed at start
    if (jobId === -1) return;
    
    try {
      const completedAt = new Date();
      const jobRecord = await db('cron_job_history').where('id', jobId).first();
      
      if (!jobRecord) {
        logger.warn(`Cannot complete job ${jobId}: record not found`);
        return;
      }
      
      const startedAt = new Date(jobRecord.started_at);
      const durationMs = completedAt.getTime() - startedAt.getTime();
      
      await db('cron_job_history')
        .where('id', jobId)
        .update({
          status,
          message: message || null,
          completed_at: completedAt,
          duration_ms: durationMs
        });
      
      logger.info(`Job completed: ${jobRecord.job_name}, ID: ${jobId}, Status: ${status}, Duration: ${durationMs}ms`);
    } catch (error) {
      logger.error(`Failed to record job completion for ID ${jobId}:`, error as Error);
    }
  }

  /**
   * Gets the history of job executions
   * @param options Query options
   * @returns Array of job records
   */
  async getJobHistory(options: {
    jobName?: string;
    status?: 'running' | 'success' | 'failed';
    limit?: number;
    offset?: number;
  } = {}): Promise<{ jobs: JobRecord[]; total: number }> {
    const { jobName, status, limit = 10, offset = 0 } = options;
    
    try {
      let query = db('cron_job_history').orderBy('started_at', 'desc');
      
      if (jobName) {
        query = query.where('job_name', jobName);
      }
      
      if (status) {
        query = query.where('status', status);
      }
      
      const jobs = await query.limit(limit).offset(offset);
      
      let countQuery = db('cron_job_history').count('id as count');
      if (jobName) {
        countQuery = countQuery.where('job_name', jobName);
      }
      if (status) {
        countQuery = countQuery.where('status', status);
      }
      
      const [total] = await countQuery;
      
      return {
        jobs,
        total: Number(total.count)
      };
    } catch (error) {
      logger.error('Failed to get job history:', error as Error);
      return { jobs: [], total: 0 };
    }
  }

  /**
   * Gets the last successful execution of a job
   * @param jobName The job name to look for
   * @returns The last successful job record or null
   */
  async getLastSuccessfulJob(jobName: string): Promise<JobRecord | null> {
    try {
      const record = await db('cron_job_history')
        .where('job_name', jobName)
        .where('status', 'success')
        .orderBy('completed_at', 'desc')
        .first();
      
      return record || null;
    } catch (error) {
      logger.error(`Failed to get last successful job for ${jobName}:`, error as Error);
      return null;
    }
  }
}

// Export a singleton instance
export const jobTrackingService = new JobTrackingService();
