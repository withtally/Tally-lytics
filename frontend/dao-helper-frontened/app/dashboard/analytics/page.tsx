'use client';

import { Button } from '../../../components/common/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';

export default function AnalyticsDashboardPage() {
  // Mock data for analytics
  const topDAOs = [
    { name: 'Uniswap', count: 1245, percentChange: 12 },
    { name: 'Aave', count: 982, percentChange: 8 },
    { name: 'Compound', count: 756, percentChange: -3 },
    { name: 'MakerDAO', count: 643, percentChange: 5 },
    { name: 'dYdX', count: 521, percentChange: 15 },
  ];

  const topTopics = [
    { name: 'Governance', count: 2345, percentChange: 5 },
    { name: 'Protocol Upgrades', count: 1876, percentChange: 12 },
    { name: 'Security', count: 1543, percentChange: 8 },
    { name: 'Treasury Management', count: 982, percentChange: -2 },
    { name: 'Community Proposals', count: 875, percentChange: 4 },
  ];

  const timeRangeOptions = ['24 Hours', '7 Days', '30 Days', '90 Days', 'Year'];

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <div className="flex space-x-2">
            {timeRangeOptions.map(option => (
              <Button key={option} variant={option === '30 Days' ? 'default' : 'outline'} size="sm">
                {option}
              </Button>
            ))}
          </div>
        </div>

        {/* Activity Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Document Activity</CardTitle>
              <CardDescription>Total documents indexed over time</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              <div className="text-muted-foreground">
                [Activity Chart Placeholder]
                <div className="mt-4 text-center text-sm">
                  Chart would display document ingestion rate over time
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Source Distribution</CardTitle>
              <CardDescription>Documents by source type</CardDescription>
            </CardHeader>
            <CardContent className="h-80 flex items-center justify-center">
              <div className="text-muted-foreground">
                [Distribution Chart Placeholder]
                <div className="mt-4 text-center text-sm">
                  Chart would show breakdown of sources (forums, news, market data)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top DAOs and Topics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Top DAOs by Activity</CardTitle>
              <CardDescription>Based on document count and engagement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topDAOs.map((dao, index) => (
                  <div key={dao.name} className="flex items-center">
                    <div className="w-8 text-muted-foreground">{index + 1}</div>
                    <div className="flex-1 font-medium">{dao.name}</div>
                    <div className="w-20 text-right">{dao.count} docs</div>
                    <div
                      className={`w-16 text-right ${dao.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {dao.percentChange >= 0 ? '+' : ''}
                      {dao.percentChange}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Discussion Topics</CardTitle>
              <CardDescription>Most frequent topics across all DAOs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topTopics.map((topic, index) => (
                  <div key={topic.name} className="flex items-center">
                    <div className="w-8 text-muted-foreground">{index + 1}</div>
                    <div className="flex-1 font-medium">{topic.name}</div>
                    <div className="w-20 text-right">{topic.count} refs</div>
                    <div
                      className={`w-16 text-right ${topic.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {topic.percentChange >= 0 ? '+' : ''}
                      {topic.percentChange}%
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Options */}
        <Card>
          <CardHeader>
            <CardTitle>Export & Reporting</CardTitle>
            <CardDescription>Generate custom reports and data exports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button className="w-full" variant="outline">
                Export as CSV
              </Button>
              <Button className="w-full" variant="outline">
                Generate PDF Report
              </Button>
              <Button className="w-full">Schedule Reports</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
