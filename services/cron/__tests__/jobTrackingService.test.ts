// Comprehensive tests for JobTrackingService
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// Create mock logger functions that we can access
const mockLoggerInfo = jest.fn();
const mockLoggerWarn = jest.fn();
const mockLoggerError = jest.fn();

// Mock logging
jest.mock('../../logging', () => ({
  Logger: jest.fn(() => ({
    info: mockLoggerInfo,
    warn: mockLoggerWarn,
    error: mockLoggerError,
  })),
}));

// Mock database module
const mockDb = jest.fn();
const mockQueryBuilder = {
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  first: jest.fn(),
  returning: jest.fn(),
  then: jest.fn((resolve: any) => Promise.resolve(resolve ? resolve([]) : [])),
};

mockDb.mockReturnValue(mockQueryBuilder);

jest.mock('../../../db/db', () => ({
  default: mockDb,
}));

// Import after mocks
import { JobTrackingService, JobStatus } from '../jobTrackingService';

describe('JobTrackingService', () => {
  let service: JobTrackingService;
  let dateSpy: any;

  beforeEach(() => {
    // Clear all mocks
    mockLoggerInfo.mockClear();
    mockLoggerWarn.mockClear();
    mockLoggerError.mockClear();
    mockDb.mockClear();
    
    // Reset query builder mocks
    Object.values(mockQueryBuilder).forEach((mockFn: any) => {
      if (mockFn.mockClear) mockFn.mockClear();
      if (mockFn.mockReturnThis) mockFn.mockReturnThis();
    });
    
    // Mock Date.now()
    const mockDate = new Date('2024-01-01T00:00:00Z');
    dateSpy = jest.fn(() => mockDate.getTime());
    global.Date.now = dateSpy;
    
    // Create service instance
    service = new JobTrackingService();
  });

  afterEach(() => {
    // Restore Date.now
    if (dateSpy) {
      mock.restore();
    }
  });

  describe('startJob', () => {
    test('should create a new job record with running status', async () => {
      const mockJobId = 'job-123';
      mockQueryBuilder.returning.mockResolvedValue([{ id: mockJobId }]);
      
      const jobId = await service.startJob('test-job', { param: 'value' });
      
      expect(jobId).toBe(mockJobId);
      expect(mockDb).toHaveBeenCalledWith('cron_job_history');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        job_name: 'test-job',
        status: JobStatus.RUNNING,
        started_at: expect.any(Date),
        metadata: { param: 'value' },
      });
    });

    test('should handle database errors gracefully', async () => {
      mockQueryBuilder.returning.mockRejectedValue(new Error('Database error'));
      
      await expect(service.startJob('test-job')).rejects.toThrow('Database error');
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to start job tracking',
        expect.objectContaining({
          jobName: 'test-job',
          error: expect.any(Error),
        })
      );
    });

    test('should work without metadata', async () => {
      const mockJobId = 'job-456';
      mockQueryBuilder.returning.mockResolvedValue([{ id: mockJobId }]);
      
      const jobId = await service.startJob('simple-job');
      
      expect(jobId).toBe(mockJobId);
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith({
        job_name: 'simple-job',
        status: JobStatus.RUNNING,
        started_at: expect.any(Date),
        metadata: {},
      });
    });
  });

  describe('completeJob', () => {
    test('should update job status to completed', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      
      await service.completeJob('job-123', { result: 'success' });
      
      expect(mockDb).toHaveBeenCalledWith('cron_job_history');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id', 'job-123');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: JobStatus.COMPLETED,
        completed_at: expect.any(Date),
        result: { result: 'success' },
      });
    });

    test('should handle non-existent job ID', async () => {
      mockQueryBuilder.update.mockResolvedValue(0);
      
      await service.completeJob('non-existent-job');
      
      expect(mockLoggerWarn).toHaveBeenCalledWith(
        'No job found to complete',
        { jobId: 'non-existent-job' }
      );
    });

    test('should work without result data', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      
      await service.completeJob('job-123');
      
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: JobStatus.COMPLETED,
        completed_at: expect.any(Date),
        result: null,
      });
    });
  });

  describe('failJob', () => {
    test('should update job status to failed with error', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      const testError = new Error('Job failed');
      
      await service.failJob('job-123', testError);
      
      expect(mockDb).toHaveBeenCalledWith('cron_job_history');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('id', 'job-123');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: JobStatus.FAILED,
        completed_at: expect.any(Date),
        error: {
          message: 'Job failed',
          stack: expect.any(String),
        },
      });
    });

    test('should handle string errors', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      
      await service.failJob('job-123', 'Simple error message');
      
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: JobStatus.FAILED,
        completed_at: expect.any(Date),
        error: { message: 'Simple error message' },
      });
    });

    test('should handle complex error objects', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      const complexError = {
        code: 'ERR_001',
        message: 'Complex error',
        details: { field: 'value' },
      };
      
      await service.failJob('job-123', complexError);
      
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        status: JobStatus.FAILED,
        completed_at: expect.any(Date),
        error: complexError,
      });
    });
  });

  describe('getRecentJobs', () => {
    test('should fetch recent jobs for a specific job name', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          job_name: 'test-job',
          status: JobStatus.COMPLETED,
          started_at: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'job-2',
          job_name: 'test-job',
          status: JobStatus.RUNNING,
          started_at: new Date('2024-01-01T01:00:00Z'),
        },
      ];
      
      mockQueryBuilder.then.mockResolvedValue(mockJobs);
      
      const result = await service.getRecentJobs('test-job', 10);
      
      expect(result).toEqual(mockJobs);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('job_name', 'test-job');
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('started_at', 'desc');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10);
    });

    test('should use default limit of 50', async () => {
      mockQueryBuilder.then.mockResolvedValue([]);
      
      await service.getRecentJobs('test-job');
      
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });

    test('should handle database errors', async () => {
      mockQueryBuilder.then.mockRejectedValue(new Error('Database error'));
      
      await expect(service.getRecentJobs('test-job')).rejects.toThrow('Database error');
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Failed to get recent jobs',
        expect.objectContaining({
          jobName: 'test-job',
          error: expect.any(Error),
        })
      );
    });
  });

  describe('getLastSuccessfulRun', () => {
    test('should fetch the most recent successful job', async () => {
      const mockJob = {
        id: 'job-123',
        job_name: 'test-job',
        status: JobStatus.COMPLETED,
        started_at: new Date('2024-01-01T00:00:00Z'),
        completed_at: new Date('2024-01-01T00:05:00Z'),
      };
      
      mockQueryBuilder.first.mockResolvedValue(mockJob);
      
      const result = await service.getLastSuccessfulRun('test-job');
      
      expect(result).toEqual(mockJob);
      expect(mockQueryBuilder.where).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('job_name', 'test-job');
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('status', JobStatus.COMPLETED);
    });

    test('should return null when no successful runs exist', async () => {
      mockQueryBuilder.first.mockResolvedValue(null);
      
      const result = await service.getLastSuccessfulRun('test-job');
      
      expect(result).toBeNull();
    });
  });

  describe('cleanupOldJobs', () => {
    test('should delete jobs older than specified days', async () => {
      const mockDeleteBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(5),
      };
      mockDb.mockReturnValueOnce(mockDeleteBuilder);
      
      const count = await service.cleanupOldJobs(30);
      
      expect(count).toBe(5);
      expect(mockDeleteBuilder.where).toHaveBeenCalledWith(
        'started_at',
        '<',
        expect.any(Date)
      );
    });

    test('should use default retention of 90 days', async () => {
      const mockDeleteBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        del: jest.fn().mockResolvedValue(10),
      };
      mockDb.mockReturnValueOnce(mockDeleteBuilder);
      
      await service.cleanupOldJobs();
      
      expect(mockLoggerInfo).toHaveBeenCalledWith(
        'Cleaned up old job records',
        { deletedCount: 10, retentionDays: 90 }
      );
    });

    test('should handle cleanup errors', async () => {
      const mockDeleteBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        del: jest.fn().mockRejectedValue(new Error('Delete failed')),
      };
      mockDb.mockReturnValueOnce(mockDeleteBuilder);
      
      await expect(service.cleanupOldJobs()).rejects.toThrow('Delete failed');
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });

  describe('getJobStats', () => {
    test('should calculate job statistics', async () => {
      const mockStats = [
        { job_name: 'job1', status: JobStatus.COMPLETED, count: '10' },
        { job_name: 'job1', status: JobStatus.FAILED, count: '2' },
        { job_name: 'job2', status: JobStatus.COMPLETED, count: '5' },
      ];
      
      const mockStatsBuilder = {
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue(mockStats),
      };
      mockDb.mockReturnValueOnce(mockStatsBuilder);
      
      const result = await service.getJobStats(7);
      
      expect(result).toEqual(mockStats);
      expect(mockStatsBuilder.groupBy).toHaveBeenCalledWith('job_name', 'status');
    });

    test('should handle empty statistics', async () => {
      const mockStatsBuilder = {
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([]),
      };
      mockDb.mockReturnValueOnce(mockStatsBuilder);
      
      const result = await service.getJobStats();
      
      expect(result).toEqual([]);
    });
  });

  describe('updateJobMetadata', () => {
    test('should update job metadata', async () => {
      mockQueryBuilder.update.mockResolvedValue(1);
      
      await service.updateJobMetadata('job-123', { progress: 50 });
      
      expect(mockQueryBuilder.update).toHaveBeenCalledWith({
        metadata: { progress: 50 },
      });
    });

    test('should merge with existing metadata', async () => {
      // First get existing metadata
      mockQueryBuilder.first.mockResolvedValue({
        metadata: { existing: 'data' },
      });
      
      // Then update
      const updateBuilder = {
        where: jest.fn().mockReturnThis(),
        update: jest.fn().mockResolvedValue(1),
      };
      mockDb.mockReturnValueOnce(updateBuilder);
      
      await service.updateJobMetadata('job-123', { progress: 50 });
      
      expect(updateBuilder.update).toHaveBeenCalledWith({
        metadata: { existing: 'data', progress: 50 },
      });
    });
  });

  describe('error handling', () => {
    test('should log all database errors', async () => {
      const dbError = new Error('Connection failed');
      mockQueryBuilder.returning.mockRejectedValue(dbError);
      
      await expect(service.startJob('test-job')).rejects.toThrow();
      
      expect(mockLoggerError).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ error: dbError })
      );
    });
  });

  describe('edge cases', () => {
    test('should handle very long job names', async () => {
      const longJobName = 'a'.repeat(255);
      mockQueryBuilder.returning.mockResolvedValue([{ id: 'job-123' }]);
      
      await service.startJob(longJobName);
      
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ job_name: longJobName })
      );
    });

    test('should handle large metadata objects', async () => {
      const largeMetadata = {
        data: Array(1000).fill({ key: 'value' }),
      };
      mockQueryBuilder.returning.mockResolvedValue([{ id: 'job-123' }]);
      
      await service.startJob('test-job', largeMetadata);
      
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: largeMetadata })
      );
    });
  });
});