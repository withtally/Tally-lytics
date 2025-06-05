'use client';

import { useRouter } from 'next/navigation';
import { Layout } from '../../components/common/Layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/common/Card';
import { Button } from '../../components/common/Button';

export default function SystemPage() {
  const router = useRouter();

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <h1 className="text-4xl font-bold mb-8">System Management</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Monitor system status and services</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View real-time health status of all services, database connections, and API
                endpoints.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/system/health')} className="w-full">
                View Health Status
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>⏰ Cron Management</CardTitle>
              <CardDescription>Easy-to-use scheduler for automated tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Schedule and monitor automated tasks with preset schedules, visual timelines, 
                and quick actions. View upcoming runs and manage distributed locks.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Preset Schedules</span>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Visual Timeline</span>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Quick Actions</span>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/system/cron-management')} className="w-full">
                Open Cron Manager
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logs Viewer</CardTitle>
              <CardDescription>View system logs</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Access and search through system logs for debugging and monitoring.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/system/logs-viewer')} className="w-full">
                View Logs
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
