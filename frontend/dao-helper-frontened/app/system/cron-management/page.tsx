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

// Preset schedules for easy selection
const PRESET_SCHEDULES = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', value: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every 30 minutes', value: '*/30 * * * *', description: 'Runs every 30 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 2 hours', value: '0 */2 * * *', description: 'Runs every 2 hours' },
  { label: 'Every 6 hours', value: '0 */6 * * *', description: 'Runs every 6 hours' },
  { label: 'Daily at midnight', value: '0 0 * * *', description: 'Runs daily at 12:00 AM' },
  { label: 'Daily at noon', value: '0 12 * * *', description: 'Runs daily at 12:00 PM' },
  { label: 'Weekly on Sunday', value: '0 0 * * 0', description: 'Runs weekly on Sunday at midnight' },
  { label: 'Monthly on 1st', value: '0 0 1 * *', description: 'Runs monthly on the 1st at midnight' },
];

// Helper to parse cron expression to human-readable format
const parseCronExpression = (cron: string): string => {
  const preset = PRESET_SCHEDULES.find(p => p.value === cron);
  if (preset) return preset.label;
  
  const parts = cron.split(' ');
  if (parts.length !== 5) return cron;
  
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }
  
  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${minute.substring(2)} minutes`;
  }
  
  if (minute === '0' && hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${hour.substring(2)} hours`;
  }
  
  return cron; // Return original if no pattern matches
};

// Visual timeline component for next runs
const TaskTimeline = ({ tasks }: { tasks: Record<string, CronTask> }) => {
  const nextRuns = Object.entries(tasks)
    .filter(([, task]) => task.isRunning && task.nextRun)
    .map(([name, task]) => ({
      name,
      time: new Date(task.nextRun!),
      task
    }))
    .sort((a, b) => a.time.getTime() - b.time.getTime())
    .slice(0, 5); // Show next 5 runs

  if (nextRuns.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Upcoming Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No scheduled runs. Start some tasks to see upcoming executions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">📅 Upcoming Runs</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {nextRuns.map(({ name, time }, index) => {
            const now = new Date();
            const diffMs = time.getTime() - now.getTime();
            const diffMinutes = Math.floor(diffMs / 60000);
            const isNext = index === 0;
            
            return (
              <div
                key={name}
                className={`flex items-center gap-4 p-3 rounded-lg ${
                  isNext ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex-shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isNext ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                </div>
                <div className="flex-grow">
                  <p className="font-medium">{name}</p>
                  <p className="text-sm text-gray-600">
                    {time.toLocaleTimeString()} - in {diffMinutes < 60 ? `${diffMinutes} minutes` : `${Math.floor(diffMinutes / 60)} hours`}
                  </p>
                </div>
                {isNext && (
                  <div className="flex-shrink-0">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Next</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default function CronManagementPage() {
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [distributedLocks, setDistributedLocks] = useState<DistributedLock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [customSchedule, setCustomSchedule] = useState<Record<string, string>>({});
  const [showHelp, setShowHelp] = useState(false);

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
          <div>
            <h1 className="text-4xl font-bold">Cron Job Management</h1>
            <p className="text-gray-600 mt-2">Manage scheduled tasks and automated processes</p>
          </div>
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
            <Button
              variant="outline"
              onClick={() => setShowHelp(!showHelp)}
            >
              {showHelp ? 'Hide' : 'Show'} Help
            </Button>
          </div>
        </div>

        {/* Help Section */}
        {showHelp && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-lg">📘 Quick Help</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>Cron Expression Format:</strong>
                <p className="text-gray-600 mt-1">
                  Cron expressions consist of 5 fields: minute (0-59), hour (0-23), day of month (1-31), 
                  month (1-12), and day of week (0-7, where 0 and 7 are Sunday).
                </p>
              </div>
              <div>
                <strong>Common Patterns:</strong>
                <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                  <li><code className="font-mono bg-white px-1 rounded">*</code> = every unit (e.g., every minute)</li>
                  <li><code className="font-mono bg-white px-1 rounded">*/N</code> = every N units (e.g., */5 = every 5 minutes)</li>
                  <li><code className="font-mono bg-white px-1 rounded">N</code> = at specific unit (e.g., 0 = at minute 0)</li>
                  <li><code className="font-mono bg-white px-1 rounded">N,M</code> = at multiple units (e.g., 0,30 = at minutes 0 and 30)</li>
                </ul>
              </div>
              <div>
                <strong>Task States:</strong>
                <ul className="list-disc list-inside text-gray-600 mt-1 space-y-1">
                  <li>🔄 <strong>Executing:</strong> Task is currently running</li>
                  <li>✅ <strong>Scheduled:</strong> Task is active and will run at next scheduled time</li>
                  <li>⏸️ <strong>Stopped:</strong> Task is inactive and won&apos;t run until started</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Quick Actions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">⚡ Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                onClick={async () => {
                  // Execute all tasks once
                  if (cronStatus) {
                    for (const taskName of Object.keys(cronStatus.tasks)) {
                      await handleExecuteTask(taskName);
                    }
                  }
                }}
                className="text-sm"
              >
                🚀 Run All Once
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Set all tasks to run every 5 minutes
                  if (cronStatus) {
                    const newSchedules: Record<string, string> = {};
                    Object.keys(cronStatus.tasks).forEach(taskName => {
                      newSchedules[taskName] = '*/5 * * * *';
                    });
                    setCustomSchedule(newSchedules);
                  }
                }}
                className="text-sm"
              >
                ⏱️ Set All to 5min
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Clear all custom schedules
                  setCustomSchedule({});
                }}
                className="text-sm"
              >
                🧹 Clear Schedules
              </Button>
              <Button
                variant="outline"
                onClick={fetchCronStatus}
                className="text-sm"
              >
                🔄 Refresh Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Overall Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Scheduler Status</p>
                <p className="text-2xl font-bold mt-1">
                  {cronStatus?.enabled ? (
                    <span className="text-green-600">✅ Enabled</span>
                  ) : (
                    <span className="text-red-600">❌ Disabled</span>
                  )}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Total Tasks</p>
                <p className="text-2xl font-bold mt-1">{cronStatus?.totalTasks || 0}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Running Tasks</p>
                <p className="text-2xl font-bold mt-1 text-green-600">{cronStatus?.runningTasks || 0}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Active Locks</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">{distributedLocks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        {cronStatus && <TaskTimeline tasks={cronStatus.tasks} />}

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
                    <p className="text-sm font-medium">
                      {parseCronExpression(task.schedule)}
                      <span className="block text-xs text-gray-400 font-mono">{task.schedule}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Next Run</p>
                    <p className="text-sm font-medium">
                      {formatNextRun(task.nextRun)}
                      {task.nextRun && (
                        <span className="block text-xs text-gray-400">
                          {new Date(task.nextRun).toLocaleTimeString()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Retry Count</p>
                    <p className="text-sm font-medium">
                      {task.retryCount} / {task.maxRetries}
                      {task.retryCount > 0 && (
                        <span className="block text-xs text-orange-500">⚠️ Has retries</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="text-sm font-medium">
                      {task.isExecuting ? '🔄 Executing' : task.isRunning ? '✅ Scheduled' : '⏸️ Stopped'}
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

                {/* Schedule Configuration */}
                <div className="mb-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quick Schedule Presets
                    </label>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          setCustomSchedule(prev => ({ ...prev, [taskName]: e.target.value }));
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      defaultValue=""
                    >
                      <option value="">Select a preset schedule...</option>
                      {PRESET_SCHEDULES.map(preset => (
                        <option key={preset.value} value={preset.value}>
                          {preset.label} - {preset.description}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Schedule
                      <span className="ml-2 text-xs text-gray-500">
                        (or enter your own cron expression)
                      </span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., 0 */2 * * * (every 2 hours)"
                      value={customSchedule[taskName] || ''}
                      onChange={(e) => setCustomSchedule(prev => ({ ...prev, [taskName]: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    {customSchedule[taskName] && (
                      <p className="mt-1 text-xs text-gray-600">
                        This will run: {parseCronExpression(customSchedule[taskName])}
                      </p>
                    )}
                  </div>
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