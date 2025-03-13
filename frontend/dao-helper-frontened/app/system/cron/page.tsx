'use client';

import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';

export default function CronJobsPage() {
  const [activeStatus, setActiveStatus] = useState('all');

  // Mock data for scheduled jobs
  const scheduledJobs = [
    {
      id: 1,
      name: 'Forum Crawler - Daily Run',
      description: 'Crawls all configured forum sources for new content',
      schedule: '0 */6 * * *',
      lastRun: '2025-03-13 12:00:05',
      nextRun: '2025-03-13 18:00:00',
      status: 'Active',
      lastRunStatus: 'Success',
      duration: '18m 42s'
    },
    {
      id: 2,
      name: 'Database Backup',
      description: 'Creates a full backup of the application database',
      schedule: '0 0 * * *',
      lastRun: '2025-03-13 00:00:12',
      nextRun: '2025-03-14 00:00:00',
      status: 'Active',
      lastRunStatus: 'Success',
      duration: '12m 18s'
    },
    {
      id: 3,
      name: 'Market Data Updater',
      description: 'Updates token prices and market data',
      schedule: '*/15 * * * *',
      lastRun: '2025-03-13 17:00:02',
      nextRun: '2025-03-13 17:15:00',
      status: 'Active',
      lastRunStatus: 'Success',
      duration: '48s'
    },
    {
      id: 4,
      name: 'Analytics Data Aggregation',
      description: 'Aggregates daily analytics data for dashboard',
      schedule: '5 0 * * *',
      lastRun: '2025-03-13 00:05:22',
      nextRun: '2025-03-14 00:05:00',
      status: 'Active',
      lastRunStatus: 'Success',
      duration: '3m 54s'
    },
    {
      id: 5,
      name: 'Old Data Cleanup',
      description: 'Removes expired cache entries and temporary files',
      schedule: '15 2 * * 0',
      lastRun: '2025-03-10 02:15:05',
      nextRun: '2025-03-17 02:15:00',
      status: 'Active',
      lastRunStatus: 'Success',
      duration: '8m 12s'
    },
    {
      id: 6,
      name: 'News Digest Generator',
      description: 'Generates daily news digest for subscribed users',
      schedule: '0 8 * * *',
      lastRun: '2025-03-13 08:00:18',
      nextRun: '2025-03-14 08:00:00',
      status: 'Paused',
      lastRunStatus: 'Failed',
      duration: '2m 45s'
    },
  ];

  // Recent job executions
  const recentExecutions = [
    {
      id: 1,
      jobName: 'Market Data Updater',
      startTime: '2025-03-13 17:00:02',
      endTime: '2025-03-13 17:00:50',
      status: 'Success',
      records: 248
    },
    {
      id: 2,
      jobName: 'Market Data Updater',
      startTime: '2025-03-13 16:45:01',
      endTime: '2025-03-13 16:45:48',
      status: 'Success',
      records: 248
    },
    {
      id: 3,
      jobName: 'Market Data Updater',
      startTime: '2025-03-13 16:30:02',
      endTime: '2025-03-13 16:30:52',
      status: 'Success',
      records: 247
    },
    {
      id: 4,
      jobName: 'Forum Crawler - Daily Run',
      startTime: '2025-03-13 12:00:05',
      endTime: '2025-03-13 12:18:47',
      status: 'Success',
      records: 156
    },
    {
      id: 5,
      jobName: 'News Digest Generator',
      startTime: '2025-03-13 08:00:18',
      endTime: '2025-03-13 08:03:03',
      status: 'Failed',
      error: 'Connection timeout to news API'
    },
  ];

  // Status filters
  const statusFilters = [
    { id: 'all', label: 'All Jobs' },
    { id: 'Active', label: 'Active' },
    { id: 'Paused', label: 'Paused' },
  ];

  // Filter jobs based on selected status
  const filteredJobs = activeStatus === 'all' 
    ? scheduledJobs 
    : scheduledJobs.filter(job => job.status === activeStatus);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Scheduled Jobs</h1>
          <Button>Create New Job</Button>
        </div>

        {/* Jobs Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scheduledJobs.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {scheduledJobs.filter(job => job.status === 'Active').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Successful Runs (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">42</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed Runs (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">1</div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs Table */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Scheduled Jobs</CardTitle>
                <CardDescription>Manage and monitor scheduled jobs</CardDescription>
              </div>
              <div className="flex gap-2">
                {statusFilters.map((filter) => (
                  <Button
                    key={filter.id}
                    variant={activeStatus === filter.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setActiveStatus(filter.id)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Name</th>
                    <th className="text-left py-3 px-2">Schedule</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-left py-3 px-2">Last Run</th>
                    <th className="text-left py-3 px-2">Duration</th>
                    <th className="text-left py-3 px-2">Next Run</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="border-b">
                      <td className="py-3 px-2">
                        <div>
                          <div className="font-medium">{job.name}</div>
                          <div className="text-xs text-muted-foreground">{job.description}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2 font-mono text-sm">{job.schedule}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          job.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div>
                          <div className="text-sm">{job.lastRun}</div>
                          <div className={`text-xs ${
                            job.lastRunStatus === 'Success' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {job.lastRunStatus}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm">{job.duration}</td>
                      <td className="py-3 px-2 text-sm">{job.nextRun}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">
                            {job.status === 'Active' ? 'Pause' : 'Resume'}
                          </Button>
                          <Button variant="outline" size="sm">Run Now</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Executions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Executions</CardTitle>
            <CardDescription>History of recent job executions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Job</th>
                    <th className="text-left py-3 px-4">Start Time</th>
                    <th className="text-left py-3 px-4">End Time</th>
                    <th className="text-left py-3 px-4">Duration</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExecutions.map((execution) => {
                    // Calculate duration
                    const start = new Date(execution.startTime);
                    const end = new Date(execution.endTime);
                    const durationMs = end.getTime() - start.getTime();
                    const durationSec = Math.floor(durationMs / 1000);
                    const minutes = Math.floor(durationSec / 60);
                    const seconds = durationSec % 60;
                    const duration = `${minutes}m ${seconds}s`;
                    
                    return (
                      <tr key={execution.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{execution.jobName}</td>
                        <td className="py-3 px-4 text-sm">{execution.startTime}</td>
                        <td className="py-3 px-4 text-sm">{execution.endTime}</td>
                        <td className="py-3 px-4 text-sm">{duration}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            execution.status === 'Success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {execution.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {execution.status === 'Success' 
                            ? `Processed ${execution.records} records` 
                            : `Error: ${execution.error}`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Export Logs</Button>
            <Button variant="outline">View Full History</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
