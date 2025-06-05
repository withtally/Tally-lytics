'use client';

import { useEffect, useState } from 'react';
import { Layout } from '../../../components/common/Layout';
import { Button } from '../../../components/common/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/common/Card';
import { unifiedCronApi } from '../../../services/api';

interface CronTask {
  name: string;
  description: string;
  isRunning: boolean;
  nextRun: string | null;
  retryCount: number;
  maxRetries: number;
  isExecuting: boolean;
  schedule: string;
  taskStatus?: Record<string, unknown>;
}

interface CronStatus {
  enabled: boolean;
  tasks: Record<string, CronTask>;
  totalTasks: number;
  runningTasks: number;
  distributedLocks?: DistributedLock[];
}

interface DistributedLock {
  lock_name: string;
  instance_id: string;
  acquired_at: string;
  expires_at: string;
  heartbeat_at: string;
}

export default function CronManagementPage() {
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [distributedLocks, setDistributedLocks] = useState<DistributedLock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [customSchedule, setCustomSchedule] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCronStatus();
    const interval = setInterval(fetchCronStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCronStatus = async () => {
    try {
      const [statusResponse, locksResponse] = await Promise.all([
        unifiedCronApi.getStatus(),
        unifiedCronApi.getLocks(),
      ]);
      
      setCronStatus(statusResponse.data || statusResponse);
      setDistributedLocks(locksResponse.data?.locks || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cron status:', err);
      setError('Failed to fetch cron status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartAll = async () => {
    setActionLoading('start-all');
    try {
      await unifiedCronApi.startAll();
      await fetchCronStatus();
    } catch (err) {
      console.error('Failed to start all tasks:', err);
      setError('Failed to start all tasks');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopAll = async () => {
    setActionLoading('stop-all');
    try {
      await unifiedCronApi.stopAll();
      await fetchCronStatus();
    } catch (err) {
      console.error('Failed to stop all tasks:', err);
      setError('Failed to stop all tasks');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartTask = async (taskName: string) => {
    setActionLoading(`start-${taskName}`);
    try {
      const schedule = customSchedule[taskName];
      await unifiedCronApi.startTask(taskName, schedule);
      await fetchCronStatus();
    } catch (err) {
      console.error(`Failed to start task ${taskName}:`, err);
      setError(`Failed to start task ${taskName}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopTask = async (taskName: string) => {
    setActionLoading(`stop-${taskName}`);
    try {
      await unifiedCronApi.stopTask(taskName);
      await fetchCronStatus();
    } catch (err) {
      console.error(`Failed to stop task ${taskName}:`, err);
      setError(`Failed to stop task ${taskName}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecuteTask = async (taskName: string) => {
    setActionLoading(`execute-${taskName}`);
    try {
      await unifiedCronApi.executeTask(taskName);
      await fetchCronStatus();
    } catch (err) {
      console.error(`Failed to execute task ${taskName}:`, err);
      setError(`Failed to execute task ${taskName}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleForceReleaseAllLocks = async () => {
    setActionLoading('force-release-locks');
    try {
      await unifiedCronApi.forceReleaseAllLocks();
      await fetchCronStatus();
    } catch (err) {
      console.error('Failed to force release locks:', err);
      setError('Failed to force release locks');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (task: CronTask) => {
    if (task.isExecuting) return 'text-blue-600 bg-blue-50';
    if (task.isRunning) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getStatusText = (task: CronTask) => {
    if (task.isExecuting) return 'Executing';
    if (task.isRunning) return 'Running';
    return 'Stopped';
  };

  const formatNextRun = (nextRun: string | null) => {
    if (!nextRun) return 'Not scheduled';
    const date = new Date(nextRun);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    
    if (diffMinutes < 0) return 'Overdue';
    if (diffMinutes < 60) return `${diffMinutes} minutes`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hours`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-10">
          <Card>
            <CardContent className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-500">Loading cron management...</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Cron Job Management</h1>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleStopAll}
              disabled={actionLoading === 'stop-all'}
            >
              {actionLoading === 'stop-all' ? 'Stopping...' : 'Stop All Tasks'}
            </Button>
            <Button
              onClick={handleStartAll}
              disabled={actionLoading === 'start-all'}
            >
              {actionLoading === 'start-all' ? 'Starting...' : 'Start All Tasks'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Overall Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Scheduler Status</p>
                <p className="text-lg font-semibold">
                  {cronStatus?.enabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Tasks</p>
                <p className="text-lg font-semibold">{cronStatus?.totalTasks || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Running Tasks</p>
                <p className="text-lg font-semibold">{cronStatus?.runningTasks || 0}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Locks</p>
                <p className="text-lg font-semibold">{distributedLocks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Task Management */}
        <div className="grid gap-6 mb-6">
          {cronStatus && Object.entries(cronStatus.tasks).map(([taskName, task]) => (
            <Card key={taskName}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{taskName}</CardTitle>
                    <CardDescription>{task.description}</CardDescription>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task)}`}>
                    {getStatusText(task)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {/* Task Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Schedule</p>
                    <p className="text-sm font-medium">{task.schedule}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Next Run</p>
                    <p className="text-sm font-medium">{formatNextRun(task.nextRun)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Retry Count</p>
                    <p className="text-sm font-medium">{task.retryCount} / {task.maxRetries}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-sm font-medium">
                      {task.isExecuting ? 'Executing' : task.isRunning ? 'Scheduled' : 'Stopped'}
                    </p>
                  </div>
                </div>

                {/* Task Status */}
                {task.taskStatus && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <h4 className="text-sm font-semibold mb-2">Task Status</h4>
                    <pre className="text-xs text-gray-600 overflow-auto">
                      {JSON.stringify(task.taskStatus, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Custom Schedule Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Schedule (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 0 */2 * * * (every 2 hours)"
                    value={customSchedule[taskName] || ''}
                    onChange={(e) => setCustomSchedule(prev => ({ ...prev, [taskName]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {task.isRunning ? (
                    <Button
                      variant="destructive"
                      onClick={() => handleStopTask(taskName)}
                      disabled={actionLoading === `stop-${taskName}`}
                    >
                      {actionLoading === `stop-${taskName}` ? 'Stopping...' : 'Stop Task'}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleStartTask(taskName)}
                      disabled={actionLoading === `start-${taskName}`}
                    >
                      {actionLoading === `start-${taskName}` ? 'Starting...' : 'Start Task'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => handleExecuteTask(taskName)}
                    disabled={actionLoading === `execute-${taskName}` || task.isExecuting}
                  >
                    {actionLoading === `execute-${taskName}` ? 'Executing...' : 'Execute Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Distributed Locks */}
        {distributedLocks.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Distributed Locks</CardTitle>
                  <CardDescription>
                    Active locks preventing concurrent task execution
                  </CardDescription>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleForceReleaseAllLocks}
                  disabled={actionLoading === 'force-release-locks'}
                  className="text-sm"
                >
                  {actionLoading === 'force-release-locks' ? 'Releasing...' : 'Force Release All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Lock Name</th>
                      <th className="text-left py-2">Instance ID</th>
                      <th className="text-left py-2">Acquired</th>
                      <th className="text-left py-2">Expires</th>
                      <th className="text-left py-2">Last Heartbeat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {distributedLocks.map((lock, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2">{lock.lock_name}</td>
                        <td className="py-2 font-mono text-xs">{lock.instance_id}</td>
                        <td className="py-2">{formatTimestamp(lock.acquired_at)}</td>
                        <td className="py-2">{formatTimestamp(lock.expires_at)}</td>
                        <td className="py-2">{formatTimestamp(lock.heartbeat_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}