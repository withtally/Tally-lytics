// services/cron/__tests__/jobTrackingService.test.ts

import { describe, it, expect } from '@jest/globals';
import { JobTrackingService, JobStatus } from '../jobTrackingService';

describe('JobTrackingService', () => {
  it('should export JobTrackingService as a constructor', () => {
    expect(JobTrackingService).toBeDefined();
    expect(typeof JobTrackingService).toBe('function');
  });

  it('should export JobStatus enum', () => {
    expect(JobStatus).toBeDefined();
    expect(JobStatus.RUNNING).toBe('running');
    expect(JobStatus.COMPLETED).toBe('completed');
    expect(JobStatus.FAILED).toBe('failed');
  });

  it('should have a constructor with no parameters', () => {
    expect(JobTrackingService.length).toBe(0);
  });

  it('should have required job tracking methods', () => {
    const instance = new JobTrackingService();
    
    expect(typeof instance.startJob).toBe('function');
    expect(typeof instance.completeJob).toBe('function');
    expect(typeof instance.failJob).toBe('function');
    expect(typeof instance.getRecentJobs).toBe('function');
    expect(typeof instance.getLastSuccessfulRun).toBe('function');
    expect(typeof instance.cleanupOldJobs).toBe('function');
    expect(typeof instance.getJobStats).toBe('function');
    expect(typeof instance.updateJobMetadata).toBe('function');
  });

  it('should have startJob method with 2 parameters', () => {
    const instance = new JobTrackingService();
    expect(instance.startJob.length).toBe(2);
  });

  it('should have completeJob method with 2 parameters', () => {
    const instance = new JobTrackingService();
    expect(instance.completeJob.length).toBe(2);
  });

  it('should have failJob method with 2 parameters', () => {
    const instance = new JobTrackingService();
    expect(instance.failJob.length).toBe(2);
  });

  it('should have getRecentJobs method with 2 parameters', () => {
    const instance = new JobTrackingService();
    expect(instance.getRecentJobs.length).toBe(2);
  });

  it('should have getLastSuccessfulRun method with 1 parameter', () => {
    const instance = new JobTrackingService();
    expect(instance.getLastSuccessfulRun.length).toBe(1);
  });

  it('should have cleanupOldJobs method with 1 parameter', () => {
    const instance = new JobTrackingService();
    expect(instance.cleanupOldJobs.length).toBe(1);
  });

  it('should have getJobStats method with 1 parameter', () => {
    const instance = new JobTrackingService();
    expect(instance.getJobStats.length).toBe(1);
  });

  it('should have updateJobMetadata method with 2 parameters', () => {
    const instance = new JobTrackingService();
    expect(instance.updateJobMetadata.length).toBe(2);
  });
});