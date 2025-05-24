'use client';

import { Button } from '../../components/common/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/common/Card';
import { Layout } from '../../components/common/Layout';

export default function DashboardPage() {
  // Mock data for the dashboard
  const recentCrawls = [
    {
      id: 1,
      source: 'Aave Forum',
      status: 'Completed',
      documents: 124,
      timestamp: '2025-03-13 12:34:21',
    },
    {
      id: 2,
      source: 'Uniswap Forum',
      status: 'In Progress',
      documents: 45,
      timestamp: '2025-03-13 16:12:09',
    },
    {
      id: 3,
      source: 'Compound Forum',
      status: 'Scheduled',
      documents: 0,
      timestamp: '2025-03-14 01:00:00',
    },
  ];

  const statistics = {
    totalDocuments: 12483,
    totalDAOs: 37,
    lastUpdate: '2025-03-13 16:45:22',
    activeCrawlers: 2,
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard Overview</h1>
          <Button>Refresh Data</Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalDocuments.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">DAOs Tracked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalDAOs}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Crawlers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.activeCrawlers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-muted-foreground">
                {statistics.lastUpdate}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Crawls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Crawls</CardTitle>
            <CardDescription>Latest data collection activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Source</th>
                    <th className="text-left py-2 px-2">Status</th>
                    <th className="text-right py-2 px-2">Documents</th>
                    <th className="text-right py-2 px-2">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCrawls.map(crawl => (
                    <tr key={crawl.id} className="border-b">
                      <td className="py-2 px-2">{crawl.source}</td>
                      <td className="py-2 px-2">
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            crawl.status === 'Completed'
                              ? 'bg-green-100 text-green-800'
                              : crawl.status === 'In Progress'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {crawl.status}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">{crawl.documents}</td>
                      <td className="py-2 px-2 text-right">{crawl.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline">View All Activity</Button>
          </CardFooter>
        </Card>

        {/* Quick Actions */}
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button className="w-full">Start New Crawler</Button>
          <Button className="w-full" variant="outline">
            View All Sources
          </Button>
          <Button className="w-full" variant="secondary">
            Generate Report
          </Button>
        </div>
      </div>
    </Layout>
  );
}
