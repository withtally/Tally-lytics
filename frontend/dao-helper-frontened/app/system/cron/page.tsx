'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';
import { cronApi } from '../../../services/api';

// Define interfaces for our data types
interface CronJob {
  id: number;
  name: string;
  description: string;
  schedule: string;
  lastRun: string;
  nextRun: string;
  status: string;
  lastRunStatus: string;
  duration: string;
}

interface CronExecution {
  id: number;
  jobName: string;
  startTime: string;
  endTime: string;
  status: string;
  records?: number;
  error?: string;
}

interface CronJobApiData {
  name: string;
  description?: string;
  lastRunStatus?: string;
  duration?: string;
}

interface CronExecutionApiData {
  jobName: string;
  startTime: string;
  endTime: string;
  status: string;
  records?: number;
  error?: string;
}

interface CronApiResponse {
  running: boolean;
  schedule: string;
  lastRun: string;
  nextRun: string;
  jobs?: CronJobApiData[];
  recentExecutions?: CronExecutionApiData[];
}

export default function CronJobsPage() {
  const [activeStatus, setActiveStatus] = useState('all');
  const [cronData, setCronData] = useState<CronApiResponse | null>(null);
  const [scheduledJobs, setScheduledJobs] = useState<CronJob[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<CronExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStartingJob, setIsStartingJob] = useState(false);
  const [isStoppingJob, setIsStoppingJob] = useState(false);
  const [scheduleInput, setScheduleInput] = useState('0 */6 * * *');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Function to fetch cron data
  const fetchCronData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await cronApi.getStatus();
      
      if (response.data) {
        setCronData(response.data as CronApiResponse);
        
        // Transform API data to match our UI needs
        if (response.data.jobs) {
          const jobs: CronJob[] = response.data.jobs.map((job: CronJobApiData, index: number) => ({
            id: index + 1,
            name: job.name,
            description: job.description || 'No description available',
            schedule: response.data.schedule || '0 */6 * * *',
            lastRun: response.data.lastRun || 'Never',
            nextRun: response.data.nextRun || 'Not scheduled',
            status: response.data.running ? 'Active' : 'Paused',
            lastRunStatus: job.lastRunStatus || 'Unknown',
            duration: job.duration || 'N/A'
          }));
          setScheduledJobs(jobs);
        } else {
          // If no jobs data, create a single job entry from the main cron data
          setScheduledJobs([{
            id: 1,
            name: 'Main Cron Job',
            description: 'Main scheduled job for the system',
            schedule: response.data.schedule || '0 */6 * * *',
            lastRun: response.data.lastRun || 'Never',
            nextRun: response.data.nextRun || 'Not scheduled',
            status: response.data.running ? 'Active' : 'Paused',
            lastRunStatus: 'Unknown',
            duration: 'N/A'
          }]);
        }
        
        // Transform recent executions data if available
        if (response.data.recentExecutions) {
          const executions: CronExecution[] = response.data.recentExecutions.map((execution: CronExecutionApiData, index: number) => ({
            id: index + 1,
            jobName: execution.jobName,
            startTime: execution.startTime,
            endTime: execution.endTime,
            status: execution.status,
            records: execution.records,
            error: execution.error
          }));
          setRecentExecutions(executions);
        }
      } else {
        throw new Error('No data returned from API');
      }
    } catch (err) {
      console.error('Error fetching cron data:', err);
      setError('Failed to fetch cron job data. Please try again.');
      
      // Keep using the current data if we have it, otherwise use fallback data
      if (scheduledJobs.length === 0) {
        // Fallback data in case API fails and we have no existing data
        setScheduledJobs([
          {
            id: 1,
            name: 'Forum Crawler - Daily Run',
            description: 'Crawls all configured forum sources for new content',
            schedule: '0 */6 * * *',
            lastRun: 'Unknown',
            nextRun: 'Unknown',
            status: 'Unknown',
            lastRunStatus: 'Unknown',
            duration: 'N/A'
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [scheduledJobs.length]);

  // Initial data fetch
  useEffect(() => {
    fetchCronData();
    
    // Set up interval to refresh data every minute
    const intervalId = setInterval(fetchCronData, 60000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchCronData]);

  // Handle starting the cron job
  const handleStartCron = async (schedule?: string) => {
    setIsStartingJob(true);
    setError(null);
    try {
      await cronApi.startCron(schedule);
      await fetchCronData(); // Refresh data
      setShowScheduleModal(false);
    } catch (err) {
      console.error('Error starting cron job:', err);
      setError('Failed to start cron job. Please try again.');
    } finally {
      setIsStartingJob(false);
    }
  };

  // Handle stopping the cron job
  const handleStopCron = async () => {
    setIsStoppingJob(true);
    setError(null);
    try {
      await cronApi.stopCron();
      await fetchCronData(); // Refresh data
    } catch (err) {
      console.error('Error stopping cron job:', err);
      setError('Failed to stop cron job. Please try again.');
    } finally {
      setIsStoppingJob(false);
    }
  };

  // Simple alert component for errors
  const Alert = ({ message }: { message: string }) => (
    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
      <h5 className="font-medium mb-1">Error</h5>
      <div>{message}</div>
    </div>
  );

  // Simple modal component for schedule input
  const ScheduleModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h3 className="text-xl font-bold mb-4">Set Cron Schedule</h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter a cron schedule expression (e.g., &quot;0 */6 * * *&quot; for every 6 hours)
        </p>
        <input
          type="text"
          value={scheduleInput}
          onChange={(e) => setScheduleInput(e.target.value)}
          className="w-full px-3 py-2 border rounded-md mb-4"
          placeholder="0 */6 * * *"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowScheduleModal(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => handleStartCron(scheduleInput)}
            disabled={isStartingJob}
          >
            {isStartingJob ? 'Starting...' : 'Start Job'}
          </Button>
        </div>
      </div>
    </div>
  );

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

  // Loading state
  if (loading && scheduledJobs.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Scheduled Jobs</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading cron job data...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Scheduled Jobs</h1>
          <div className="flex gap-2">
            {cronData?.running ? (
              <Button 
                variant="destructive" 
                onClick={handleStopCron}
                disabled={isStoppingJob}
              >
                {isStoppingJob ? 'Stopping...' : 'Stop All Jobs'}
              </Button>
            ) : (
              <Button 
                onClick={() => setShowScheduleModal(true)}
                disabled={isStartingJob}
              >
                {isStartingJob ? 'Starting...' : 'Start Scheduled Jobs'}
              </Button>
            )}
            <Button variant="outline" onClick={fetchCronData} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {error && <Alert message={error} />}
        {showScheduleModal && <ScheduleModal />}

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
              <CardTitle className="text-sm font-medium">Next Scheduled Run</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {cronData?.nextRun ? new Date(cronData.nextRun).toLocaleString() : 'Not scheduled'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Current Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">
                {cronData?.schedule || 'None'}
              </div>
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
                    <th className="text-left py-3 px-2">Description</th>
                    <th className="text-left py-3 px-2">Schedule</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-right py-3 px-2">Last Run</th>
                    <th className="text-right py-3 px-2">Next Run</th>
                    <th className="text-right py-3 px-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJobs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No jobs found. {error ? 'An error occurred while fetching data.' : ''}
                      </td>
                    </tr>
                  ) : (
                    filteredJobs.map((job) => (
                      <tr key={job.id} className="border-b">
                        <td className="py-3 px-2 font-medium">{job.name}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">{job.description}</td>
                        <td className="py-3 px-2 text-sm font-mono">{job.schedule}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            job.status === 'Active' 
                              ? 'bg-green-100 text-green-800' 
                              : job.status === 'Paused' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {job.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-sm">
                          <div>{job.lastRun}</div>
                          <div className={`text-xs ${
                            job.lastRunStatus === 'Success' 
                              ? 'text-green-600' 
                              : job.lastRunStatus === 'Failed' 
                                ? 'text-red-600'
                                : ''
                          }`}>
                            {job.lastRunStatus}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-right text-sm">{job.nextRun}</td>
                        <td className="py-3 px-2 text-right text-sm">{job.duration}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Job Executions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Job Executions</CardTitle>
            <CardDescription>History of recent job runs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Job Name</th>
                    <th className="text-left py-3 px-2">Start Time</th>
                    <th className="text-left py-3 px-2">End Time</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-right py-3 px-2">Records Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {recentExecutions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground">
                        No recent executions found.
                      </td>
                    </tr>
                  ) : (
                    recentExecutions.map((execution) => (
                      <tr key={execution.id} className="border-b">
                        <td className="py-3 px-2 font-medium">{execution.jobName}</td>
                        <td className="py-3 px-2 text-sm">{execution.startTime}</td>
                        <td className="py-3 px-2 text-sm">{execution.endTime}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            execution.status === 'Success' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {execution.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          {execution.status === 'Failed' ? (
                            <span className="text-sm text-red-600">{execution.error}</span>
                          ) : (
                            <span>{execution.records}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Export Execution History</Button>
            <Button variant="outline">View Full Logs</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
