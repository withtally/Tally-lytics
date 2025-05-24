'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../../components/common/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';

// Define proper types for logs
interface LogEntry {
  id: number;
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
  source: string;
  message: string;
  metadata: Record<string, string | number | boolean>;
}

export default function LogsViewerPage() {
  const [logLevel, setLogLevel] = useState('all');
  const [timeRange, setTimeRange] = useState('24h');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogFile, setSelectedLogFile] = useState('server.log');
  const [isLoading, setIsLoading] = useState(false);
  const [parsedLogs, setParsedLogs] = useState<LogEntry[]>([]);

  // Get list of available log files
  const logFiles = [
    // DAO-specific logs
    { name: 'ARBITRUM-crawler.log', category: 'DAO Crawlers' },
    { name: 'UNISWAP-crawler.log', category: 'DAO Crawlers' },
    { name: 'COMPOUND-crawler.log', category: 'DAO Crawlers' },
    { name: 'SAFE-crawler.log', category: 'DAO Crawlers' },
    { name: 'GITCOIN-crawler.log', category: 'DAO Crawlers' },
    { name: 'CABIN-crawler.log', category: 'DAO Crawlers' },
    { name: 'ZKSYNC-crawler.log', category: 'DAO Crawlers' },

    // Forum crawlers
    { name: 'ARBITRUM-forum-crawler.log', category: 'Forum Crawlers' },
    { name: 'UNISWAP-forum-crawler.log', category: 'Forum Crawlers' },
    { name: 'COMPOUND-forum-crawler.log', category: 'Forum Crawlers' },
    { name: 'SAFE-forum-crawler.log', category: 'Forum Crawlers' },
    { name: 'GITCOIN-forum-crawler.log', category: 'Forum Crawlers' },
    { name: 'CABIN-forum-crawler.log', category: 'Forum Crawlers' },
    { name: 'ZKSYNC-forum-crawler.log', category: 'Forum Crawlers' },

    // System logs
    { name: 'server.log', category: 'System' },
    { name: 'global-error-handler.log', category: 'System' },
    { name: 'rate-limiter.log', category: 'System' },
    { name: 'job-tracking.log', category: 'System' },

    // Service logs
    { name: 'common-topics.log', category: 'Services' },
    { name: 'news-crawler.log', category: 'Services' },
    { name: 'user-service.log', category: 'Services' },
    { name: 'post-service.log', category: 'Services' },
    { name: 'search-logger.log', category: 'Services' },
    { name: 'token-market-data-crawler.log', category: 'Services' },

    // LLM logs
    { name: 'llm-service.log', category: 'LLM' },
    { name: 'llm-routes.log', category: 'LLM' },
    { name: 'llm-errors.log', category: 'LLM' },
    { name: 'chat-api.log', category: 'LLM' },
    { name: 'chat-llm-service.log', category: 'LLM' },
  ];

  // Group log files by category
  const groupedLogFiles = logFiles.reduce(
    (acc, logFile) => {
      if (!acc[logFile.category]) {
        acc[logFile.category] = [];
      }
      acc[logFile.category].push(logFile);
      return acc;
    },
    {} as Record<string, { name: string; category: string }[]>
  );

  // Log level filters
  const logLevels = [
    { id: 'all', label: 'All Levels' },
    { id: 'ERROR', label: 'Error' },
    { id: 'WARN', label: 'Warning' },
    { id: 'INFO', label: 'Info' },
    { id: 'DEBUG', label: 'Debug' },
  ];

  // Time range options
  const timeRangeOptions = [
    { id: '1h', label: '1 Hour' },
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
  ];

  // Function to fetch log content
  const fetchLogContent = useCallback(async (logFile: string) => {
    setIsLoading(true);
    // In a real implementation, this would be an API call
    // For now, we'll simulate loading log content
    try {
      // This is a placeholder - in a real implementation, you would fetch from an API
      // Example API call:
      // const response = await fetch(`/api/logs/${logFile}?timeRange=${timeRange}`);
      // const data = await response.text();

      // For demo purposes, we'll show a simulation message
      setTimeout(() => {
        // Generate some random parsed logs based on the file name
        const simulatedLogs = generateSimulatedLogs(logFile, 20);
        setParsedLogs(simulatedLogs);
        setIsLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error fetching log file:', error);
      setParsedLogs([]);
      setIsLoading(false);
    }
  }, []);

  // Function to generate simulated logs
  const generateSimulatedLogs = (logFile: string, count: number): LogEntry[] => {
    const logs: LogEntry[] = [];
    const levels: LogEntry['level'][] = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
    const sources = ['API', 'Database', 'Crawler', 'Parser', 'Fetch'];

    // Extract DAO name from log file if applicable
    let daoName = '';
    if (logFile.includes('-')) {
      daoName = logFile.split('-')[0];
    }

    const now = new Date();

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now.getTime() - i * 60000); // 1 minute apart
      const level = levels[Math.floor(Math.random() * levels.length)];

      let message = '';
      let metadata: Record<string, string | number | boolean> = {};

      // Customize message based on log file type
      if (logFile.includes('crawler')) {
        message = `Crawling ${daoName} data from endpoint /api/${daoName.toLowerCase()}/posts`;
        metadata = {
          postsProcessed: Math.floor(Math.random() * 100),
          newPosts: Math.floor(Math.random() * 20),
          duration: `${Math.floor(Math.random() * 60)}s`,
        };
      } else if (logFile.includes('forum')) {
        message = `Processing forum data for ${daoName}`;
        metadata = {
          threadsScanned: Math.floor(Math.random() * 50),
          commentsIndexed: Math.floor(Math.random() * 200),
        };
      } else if (logFile.includes('server')) {
        message = `API request processed: ${['GET', 'POST', 'PUT'][Math.floor(Math.random() * 3)]} /api/${['daos', 'posts', 'users', 'search'][Math.floor(Math.random() * 4)]}`;
        metadata = {
          duration: `${Math.floor(Math.random() * 500)}ms`,
          status: [200, 201, 404, 500][Math.floor(Math.random() * 4)],
        };
      } else {
        message = `Processing data for service: ${logFile.replace('.log', '')}`;
        metadata = {
          itemsProcessed: Math.floor(Math.random() * 100),
        };
      }

      // Add some errors and warnings occasionally
      if (level === 'ERROR') {
        message = `Failed to process data: timeout error`;
        metadata.error = 'Connection timeout';
        metadata.retryCount = Math.floor(Math.random() * 3);
      } else if (level === 'WARN') {
        message = `Slow response detected for ${daoName || 'service'}`;
        metadata.responseTime = `${Math.floor(Math.random() * 2000 + 1000)}ms`;
      }

      logs.push({
        id: i,
        timestamp: timestamp.toISOString().replace('T', ' ').substring(0, 19),
        level,
        source: `${daoName || logFile.split('.')[0]} ${sources[Math.floor(Math.random() * sources.length)]}`,
        message,
        metadata,
      });
    }

    return logs;
  };

  // Effect to fetch log content when selected file changes
  useEffect(() => {
    if (selectedLogFile) {
      fetchLogContent(selectedLogFile);
    }
  }, [selectedLogFile, fetchLogContent]);

  // Filter logs based on selected filters
  const filteredLogs = parsedLogs.filter(log => {
    const levelMatch = logLevel === 'all' || log.level === logLevel;
    const searchMatch =
      !searchQuery.trim() || log.message.toLowerCase().includes(searchQuery.toLowerCase());

    return levelMatch && searchMatch;
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
            {timeRangeOptions.map(option => (
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Log File Selection */}
          <div className="lg:col-span-1">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Log Files</CardTitle>
                <CardDescription>Select a log file to view</CardDescription>
              </CardHeader>
              <CardContent className="max-h-[600px] overflow-y-auto">
                <div className="space-y-4">
                  {Object.entries(groupedLogFiles).map(([category, files]) => (
                    <div key={category}>
                      <h3 className="text-sm font-medium text-muted-foreground mb-2">{category}</h3>
                      <div className="space-y-1">
                        {files.map(file => (
                          <Button
                            key={file.name}
                            variant={selectedLogFile === file.name ? 'default' : 'ghost'}
                            className="w-full justify-start text-left h-auto py-2"
                            onClick={() => setSelectedLogFile(file.name)}
                          >
                            <span className="truncate">{file.name}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Log Content and Filters */}
          <div className="lg:col-span-3">
            {/* Log Filters */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Log Level</div>
                    <div className="flex flex-wrap gap-2">
                      {logLevels.map(level => (
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

                  <div className="md:col-span-2">
                    <div className="text-sm font-medium mb-2">Search Logs</div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
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
                    <CardTitle>Log Entries: {selectedLogFile}</CardTitle>
                    <CardDescription>
                      Showing {filteredLogs.length}{' '}
                      {filteredLogs.length === 1 ? 'entry' : 'entries'} for the last{' '}
                      {timeRangeOptions.find(t => t.id === timeRange)?.label.toLowerCase()}
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    Download Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="flex items-center space-x-2">
                      <div className="h-4 w-4 bg-primary rounded-full animate-bounce"></div>
                      <div
                        className="h-4 w-4 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      ></div>
                      <div
                        className="h-4 w-4 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      ></div>
                      <span className="ml-2">Loading logs...</span>
                    </div>
                  </div>
                ) : (
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
                        {filteredLogs.map(log => (
                          <tr key={log.id} className="border-b">
                            <td className="py-3 px-2 whitespace-nowrap text-sm">{log.timestamp}</td>
                            <td className="py-3 px-2">
                              <span
                                className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getLogLevelColor(log.level)}`}
                              >
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
                                      {key}: {String(value)}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <Button variant="outline" size="sm">
                                Details
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div className="text-sm text-muted-foreground">
                  <p>Path: /logs/{selectedLogFile}</p>
                  <p className="mt-1">
                    Export:
                    <Button variant="link" size="sm" className="px-1">
                      JSON
                    </Button>
                    <Button variant="link" size="sm" className="px-1">
                      CSV
                    </Button>
                    <Button variant="link" size="sm" className="px-1">
                      Text
                    </Button>
                  </p>
                </div>
                <Button variant="outline">Load More</Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
