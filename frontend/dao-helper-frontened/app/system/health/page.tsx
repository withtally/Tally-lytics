'use client';

import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';

export default function SystemHealthPage() {
  const [timeRange, setTimeRange] = useState('24h');

  // Mock data for system components
  const systemComponents = [
    {
      id: 1,
      name: 'API Server',
      status: 'Healthy',
      uptime: '99.98%',
      responseTime: '120ms',
      loadAverage: '0.42',
      lastChecked: '2025-03-13 17:12:05'
    },
    {
      id: 2,
      name: 'Database',
      status: 'Healthy',
      uptime: '99.99%',
      connectionCount: 12,
      queryTime: '35ms',
      lastChecked: '2025-03-13 17:12:02'
    },
    {
      id: 3,
      name: 'Web Crawlers',
      status: 'Warning',
      activeJobs: 4,
      queuedJobs: 12,
      failedJobs: 1,
      lastChecked: '2025-03-13 17:11:58'
    },
    {
      id: 4,
      name: 'Search Engine',
      status: 'Healthy',
      indexSize: '24.5 GB',
      queryCount: '342/hr',
      averageQueryTime: '85ms',
      lastChecked: '2025-03-13 17:12:00'
    },
    {
      id: 5,
      name: 'File Storage',
      status: 'Critical',
      usedSpace: '89%',
      totalSpace: '500 GB',
      readSpeed: '105 MB/s',
      lastChecked: '2025-03-13 17:11:55'
    },
  ];

  // Recent alerts
  const recentAlerts = [
    {
      id: 1,
      component: 'File Storage',
      level: 'Critical',
      message: 'Storage capacity exceeding 85% threshold',
      timestamp: '2025-03-13 16:45:12'
    },
    {
      id: 2,
      component: 'Web Crawlers',
      level: 'Warning',
      message: 'Crawler job for Uniswap forums failed',
      timestamp: '2025-03-13 15:22:48'
    },
    {
      id: 3,
      component: 'API Server',
      level: 'Warning',
      message: 'Elevated response times (>200ms) detected',
      timestamp: '2025-03-13 14:08:31'
    },
    {
      id: 4,
      component: 'Database',
      level: 'Info',
      message: 'Automated backup completed successfully',
      timestamp: '2025-03-13 12:00:05'
    },
  ];

  // Time range options
  const timeRangeOptions = [
    { id: '1h', label: '1 Hour' },
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
  ];

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">System Health</h1>
          <div className="flex gap-2">
            {timeRangeOptions.map((option) => (
              <Button
                key={option.id}
                variant={timeRange === option.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* System Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className={`h-3 w-3 rounded-full mr-2 ${
                  systemComponents.some(c => c.status === 'Critical') 
                    ? 'bg-red-500' 
                    : systemComponents.some(c => c.status === 'Warning') 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500'
                }`}></div>
                <div className="text-xl font-bold">
                  {systemComponents.some(c => c.status === 'Critical') 
                    ? 'Critical Issues' 
                    : systemComponents.some(c => c.status === 'Warning') 
                      ? 'Warnings' 
                      : 'All Systems Operational'}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Overall Uptime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.97%</div>
              <div className="text-xs text-muted-foreground">Last 30 days</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recentAlerts.filter(a => a.level === 'Critical' || a.level === 'Warning').length}
              </div>
              <div className="text-xs text-muted-foreground">
                {recentAlerts.filter(a => a.level === 'Critical').length} critical, 
                {recentAlerts.filter(a => a.level === 'Warning').length} warnings
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last System Check</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{systemComponents[0].lastChecked}</div>
              <div className="text-xs text-muted-foreground">Checks run every 5 minutes</div>
            </CardContent>
          </Card>
        </div>

        {/* System Components Health */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>System Components</CardTitle>
            <CardDescription>Health status of all system components</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {systemComponents.map((component) => (
                <div key={component.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-medium text-lg">{component.name}</h3>
                      <div className="text-sm text-muted-foreground">Last checked: {component.lastChecked}</div>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        component.status === 'Healthy' 
                          ? 'bg-green-100 text-green-800' 
                          : component.status === 'Warning' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {component.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Object.entries(component).map(([key, value]) => {
                      // Skip displaying these fields
                      if (['id', 'name', 'status', 'lastChecked'].includes(key)) return null;
                      
                      return (
                        <div key={key} className="bg-muted rounded p-2">
                          <div className="text-xs text-muted-foreground mb-1">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </div>
                          <div className="font-medium">{value}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button>Run Full System Check</Button>
          </CardFooter>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>System alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Level</th>
                    <th className="text-left py-3 px-4">Component</th>
                    <th className="text-left py-3 px-4">Message</th>
                    <th className="text-right py-3 px-4">Timestamp</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.map((alert) => (
                    <tr key={alert.id} className="border-b">
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          alert.level === 'Critical' 
                            ? 'bg-red-100 text-red-800' 
                            : alert.level === 'Warning' 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}>
                          {alert.level}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium">{alert.component}</td>
                      <td className="py-3 px-4">{alert.message}</td>
                      <td className="py-3 px-4 text-right text-sm">{alert.timestamp}</td>
                      <td className="py-3 px-4 text-right">
                        <Button variant="outline" size="sm">Resolve</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Export Alerts</Button>
            <Button variant="outline">Configure Alert Rules</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
