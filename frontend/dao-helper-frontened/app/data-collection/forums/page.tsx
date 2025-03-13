'use client';

import { Button } from '../../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';

export default function ForumsCrawlerPage() {
  // Mock data for forum crawlers
  const crawlers = [
    { 
      id: 1, 
      name: 'Aave Forums', 
      url: 'https://governance.aave.com', 
      status: 'Active',
      lastRun: '2025-03-13 14:22:05',
      docsCollected: 1245,
      schedule: 'Every 6 hours' 
    },
    { 
      id: 2, 
      name: 'Uniswap Forums', 
      url: 'https://gov.uniswap.org', 
      status: 'Active',
      lastRun: '2025-03-13 12:45:18',
      docsCollected: 897,
      schedule: 'Every 6 hours' 
    },
    { 
      id: 3, 
      name: 'Compound Forums', 
      url: 'https://www.comp.xyz', 
      status: 'Inactive',
      lastRun: '2025-03-12 23:11:56',
      docsCollected: 756,
      schedule: 'Every 12 hours' 
    },
    { 
      id: 4, 
      name: 'MakerDAO Forums', 
      url: 'https://forum.makerdao.com', 
      status: 'Active',
      lastRun: '2025-03-13 16:08:32',
      docsCollected: 1432,
      schedule: 'Every 6 hours' 
    },
    { 
      id: 5, 
      name: 'dYdX Forums', 
      url: 'https://forums.dydx.community', 
      status: 'Error',
      lastRun: '2025-03-13 04:15:47',
      docsCollected: 521,
      schedule: 'Every 12 hours' 
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Forum Crawlers</h1>
          <Button>Add New Crawler</Button>
        </div>

        {/* Crawler Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Crawlers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{crawlers.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Crawlers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{crawlers.filter(c => c.status === 'Active').length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {crawlers.reduce((acc, curr) => acc + curr.docsCollected, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Crawlers with Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{crawlers.filter(c => c.status === 'Error').length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Crawlers List */}
        <Card>
          <CardHeader>
            <CardTitle>Forum Crawlers</CardTitle>
            <CardDescription>Manage and monitor forum crawlers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Name</th>
                    <th className="text-left py-3 px-2">URL</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-right py-3 px-2">Documents</th>
                    <th className="text-right py-3 px-2">Last Run</th>
                    <th className="text-right py-3 px-2">Schedule</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {crawlers.map((crawler) => (
                    <tr key={crawler.id} className="border-b">
                      <td className="py-3 px-2 font-medium">{crawler.name}</td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        <a href={crawler.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {crawler.url}
                        </a>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          crawler.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : crawler.status === 'Inactive' 
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {crawler.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">{crawler.docsCollected.toLocaleString()}</td>
                      <td className="py-3 px-2 text-right text-sm">{crawler.lastRun}</td>
                      <td className="py-3 px-2 text-right text-sm">{crawler.schedule}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">Run Now</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Export Settings</Button>
            <Button variant="outline">Configure Global Settings</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
