'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../components/common/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/common/Card';
import { Layout } from '../components/common/Layout';
import { crawlerApi, healthApi } from '../services/api';
import type { CrawlerStatusItem } from '../services/api';

export default function Home() {
  const router = useRouter();
  const [crawlerStatuses, setCrawlerStatuses] = useState<CrawlerStatusItem[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch crawler status
      const crawlerResponse = await crawlerApi.getAllStatus();
      setCrawlerStatuses(crawlerResponse.statuses || []);

      // Fetch system health
      try {
        const healthResponse = await healthApi.getSystemHealth();
        setSystemHealth(healthResponse.data);
      } catch (healthError) {
        console.error('Failed to fetch health status:', healthError);
      }

      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to fetch dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'text-green-600';
      case 'idle':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getActiveCrawlers = () => {
    return crawlerStatuses.filter(crawler => crawler.status === 'running').length;
  };

  const getTotalDocuments = () => {
    return crawlerStatuses.reduce((total, crawler) => {
      return total + (crawler.progress?.totalDocuments || 0);
    }, 0);
  };

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <h1 className="text-4xl font-bold mb-8">Tally-lytics Dashboard</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Active Crawlers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{getActiveCrawlers()}</p>
              <p className="text-xs text-muted-foreground">of {crawlerStatuses.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{getTotalDocuments().toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">indexed documents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${systemHealth ? 'text-green-600' : 'text-gray-400'}`}>
                {systemHealth ? 'Healthy' : 'Unknown'}
              </p>
              <p className="text-xs text-muted-foreground">all systems operational</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-muted-foreground">real-time updates</p>
            </CardContent>
          </Card>
        </div>

        {/* Crawler Status List */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Forum Crawlers</CardTitle>
            <CardDescription>Real-time status of all configured forum crawlers</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p>Loading crawler status...</p>
            ) : crawlerStatuses.length === 0 ? (
              <p className="text-muted-foreground">No crawlers configured</p>
            ) : (
              <div className="space-y-4">
                {crawlerStatuses.map((crawler) => (
                  <div key={crawler.forumName} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-semibold">{crawler.forumName}</h3>
                      <p className={`text-sm ${getStatusColor(crawler.status)}`}>
                        Status: {crawler.status}
                      </p>
                      {crawler.progress && (
                        <p className="text-sm text-muted-foreground">
                          Documents: {crawler.progress.processedDocuments || 0} / {crawler.progress.totalDocuments || 0}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => router.push('/crawlers')}
                    >
                      Manage
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Crawler Management</CardTitle>
              <CardDescription>Start, stop, and monitor crawlers</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Manage forum crawlers and view detailed indexing progress.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/crawlers')} className="w-full">
                Manage Crawlers
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search Interface</CardTitle>
              <CardDescription>Search indexed content</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Semantic search across all indexed forum posts and topics.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/search')} className="w-full">
                Go to Search
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Monitoring</CardTitle>
              <CardDescription>Health and job history</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View system health, cron job history, and logs.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={() => router.push('/system')} className="w-full">
                View System Status
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
