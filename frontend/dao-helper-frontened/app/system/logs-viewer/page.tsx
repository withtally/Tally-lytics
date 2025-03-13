'use client';

import React, { useState } from 'react';
import { Button } from '../../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';

export default function LogsViewerPage() {
  const [logLevel, setLogLevel] = useState('all');
  const [logSource, setLogSource] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');

  // Mock log data
  const logEntries = [
    {
      id: 1,
      timestamp: '2025-03-13 17:12:05',
      level: 'INFO',
      source: 'API Server',
      message: 'API request completed successfully: GET /api/daos',
      metadata: { requestId: 'req_12345', duration: '42ms', userId: 'user_789' }
    },
    {
      id: 2,
      timestamp: '2025-03-13 17:10:22',
      level: 'WARN',
      source: 'Crawler Service',
      message: 'Rate limit approaching for forum.aave.com, throttling requests',
      metadata: { remainingRequests: 12, resetTime: '2025-03-13 17:15:00' }
    },
    {
      id: 3,
      timestamp: '2025-03-13 17:08:45',
      level: 'ERROR',
      source: 'Database',
      message: 'Connection timeout during query execution',
      metadata: { query: 'SELECT * FROM documents WHERE...', retryCount: 2 }
    },
    {
      id: 4,
      timestamp: '2025-03-13 17:05:18',
      level: 'INFO',
      source: 'Auth Service',
      message: 'User successfully authenticated',
      metadata: { userId: 'user_456', method: 'oauth' }
    },
    {
      id: 5,
      timestamp: '2025-03-13 17:03:51',
      level: 'DEBUG',
      source: 'Search Engine',
      message: 'Query optimization applied for search term "governance proposal"',
      metadata: { originalTime: '125ms', optimizedTime: '68ms' }
    },
    {
      id: 6,
      timestamp: '2025-03-13 17:01:10',
      level: 'ERROR',
      source: 'Crawler Service',
      message: 'Failed to crawl URL https://forum.compound.finance/discussions/345',
      metadata: { statusCode: 503, error: 'Service Unavailable', retryScheduled: true }
    },
    {
      id: 7,
      timestamp: '2025-03-13 17:00:05',
      level: 'INFO',
      source: 'Cron Manager',
      message: 'Scheduled job "Market Data Updater" executed successfully',
      metadata: { jobId: 'job_123', duration: '48s', recordsProcessed: 248 }
    },
    {
      id: 8,
      timestamp: '2025-03-13 16:58:22',
      level: 'DEBUG',
      source: 'API Server',
      message: 'Request validation completed',
      metadata: { requestId: 'req_12344', validationTime: '3ms' }
    },
  ];

  // Log level filters
  const logLevels = [
    { id: 'all', label: 'All Levels' },
    { id: 'ERROR', label: 'Error' },
    { id: 'WARN', label: 'Warning' },
    { id: 'INFO', label: 'Info' },
    { id: 'DEBUG', label: 'Debug' },
  ];

  // Log source filters
  const logSources = [
    { id: 'all', label: 'All Sources' },
    { id: 'API Server', label: 'API Server' },
    { id: 'Database', label: 'Database' },
    { id: 'Crawler Service', label: 'Crawler Service' },
    { id: 'Search Engine', label: 'Search Engine' },
    { id: 'Auth Service', label: 'Auth Service' },
    { id: 'Cron Manager', label: 'Cron Manager' },
  ];

  // Time range options
  const timeRangeOptions = [
    { id: '1h', label: '1 Hour' },
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
  ];

  // Filter logs based on selected filters
  const filteredLogs = logEntries.filter(log => {
    const levelMatch = logLevel === 'all' || log.level === logLevel;
    const sourceMatch = logSource === 'all' || log.source === logSource;
    const searchMatch = !searchQuery.trim() || log.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    return levelMatch && sourceMatch && searchMatch;
  });

  // Get log level color
  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      case 'WARN':
        return 'bg-yellow-100 text-yellow-800';
      case 'INFO':
        return 'bg-blue-100 text-blue-800';
      case 'DEBUG':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">System Logs</h1>
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

        {/* Log Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium mb-2">Log Level</div>
                <div className="flex flex-wrap gap-2">
                  {logLevels.map((level) => (
                    <Button
                      key={level.id}
                      variant={logLevel === level.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogLevel(level.id)}
                    >
                      {level.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Log Source</div>
                <div className="flex flex-wrap gap-2">
                  {logSources.map((source) => (
                    <Button
                      key={source.id}
                      variant={logSource === source.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setLogSource(source.id)}
                    >
                      {source.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div>
                <div className="text-sm font-medium mb-2">Search Logs</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search log messages..."
                    className="flex-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button size="sm" variant="outline" onClick={() => setSearchQuery('')}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Log Entries</CardTitle>
                <CardDescription>
                  Showing {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'} for the last {timeRangeOptions.find(t => t.id === timeRange)?.label.toLowerCase()}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Download Logs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Time</th>
                    <th className="text-left py-3 px-2">Level</th>
                    <th className="text-left py-3 px-2">Source</th>
                    <th className="text-left py-3 px-2">Message</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="py-3 px-2 whitespace-nowrap text-sm">
                        {log.timestamp}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getLogLevelColor(log.level)}`}>
                          {log.level}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm font-medium">{log.source}</td>
                      <td className="py-3 px-2 text-sm">
                        <div>{log.message}</div>
                        {log.metadata && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {Object.entries(log.metadata).map(([key, value]) => (
                              <span key={key} className="mr-3">
                                {key}: {value.toString()}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <Button variant="outline" size="sm">Details</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Export options: 
              <Button variant="link" size="sm" className="px-1">JSON</Button>
              <Button variant="link" size="sm" className="px-1">CSV</Button>
              <Button variant="link" size="sm" className="px-1">Text</Button>
            </div>
            <Button variant="outline">Load More</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
