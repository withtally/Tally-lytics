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
                View real-time health status of all services, database connections, and API endpoints.
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
              <CardTitle>Cron Jobs</CardTitle>
              <CardDescription>Manage scheduled tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure and monitor cron jobs for automated crawling and data processing.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/system/cron')} className="w-full">
                Manage Cron Jobs
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