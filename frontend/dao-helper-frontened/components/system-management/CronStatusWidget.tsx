'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../common/Card';
import { Button } from '../common/Button';
import { unifiedCronApi } from '../../services/api';

interface CronTaskStatus {
  retryCount: number;
  isRunning: boolean;
}

interface CronStatus {
  enabled: boolean;
  totalTasks: number;
  runningTasks: number;
  tasks?: Record<string, CronTaskStatus>;
}

export function CronStatusWidget() {
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchCronStatus();
    const interval = setInterval(fetchCronStatus, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCronStatus = async () => {
    try {
      const response = await unifiedCronApi.getStatus();
      setCronStatus(response.data || response);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch cron status:', err);
      setError('Failed to fetch status');
    } finally {
      setIsLoading(false);
    }
  };

  const getOverallStatus = () => {
    if (!cronStatus) return { status: 'Unknown', color: 'text-gray-500' };
    if (!cronStatus.enabled) return { status: 'Disabled', color: 'text-gray-500' };
    if (cronStatus.runningTasks > 0) return { status: 'Active', color: 'text-green-600' };
    return { status: 'Idle', color: 'text-blue-600' };
  };

  const getTasksWithIssues = () => {
    if (!cronStatus?.tasks) return [];
    return Object.entries(cronStatus.tasks).filter(([, task]: [string, CronTaskStatus]) => 
      task.retryCount > 0 || !task.isRunning
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cron Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-20">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cron Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-4">
            <p className="text-sm">{error}</p>
            <Button 
              variant="outline" 
              onClick={fetchCronStatus}
              className="mt-2 text-xs"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const overallStatus = getOverallStatus();
  const tasksWithIssues = getTasksWithIssues();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Cron Jobs</span>
          <span className={`text-sm font-normal ${overallStatus.color}`}>
            {overallStatus.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{cronStatus?.totalTasks || 0}</p>
              <p className="text-xs text-gray-500">Total Tasks</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{cronStatus?.runningTasks || 0}</p>
              <p className="text-xs text-gray-500">Running</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{tasksWithIssues.length}</p>
              <p className="text-xs text-gray-500">Issues</p>
            </div>
          </div>

          {/* Issues Alert */}
          {tasksWithIssues.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
              <p className="text-xs text-yellow-800 font-medium">
                {tasksWithIssues.length} task(s) need attention
              </p>
              <ul className="text-xs text-yellow-700 mt-1">
                {tasksWithIssues.slice(0, 2).map(([taskName, task]: [string, CronTaskStatus]) => (
                  <li key={taskName}>
                    {taskName}: {!task.isRunning ? 'Stopped' : `${task.retryCount} retries`}
                  </li>
                ))}
                {tasksWithIssues.length > 2 && (
                  <li>+{tasksWithIssues.length - 2} more...</li>
                )}
              </ul>
            </div>
          )}

          {/* Action Button */}
          <Button 
            variant="outline" 
            onClick={() => router.push('/system/cron-management')}
            className="w-full text-sm"
          >
            Manage Cron Jobs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}