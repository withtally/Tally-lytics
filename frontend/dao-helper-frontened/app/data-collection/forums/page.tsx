'use client';

import React, { useState, useEffect } from 'react';
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
import { crawlerApi } from '../../../services/api';

// Define interface for crawler data
interface Crawler {
  id: number;
  name: string;
  url: string;
  status: string;
  lastRun: string;
  nextRun: string;
  lastError: string;
  progress: string;
  docsCollected: number;
  schedule: string;
  rawProgress?: Record<string, unknown> | null; // Store the raw progress data for formatting
}

// Define interface for API response
interface CrawlerApiData {
  forumName?: string;
  url?: string;
  status?: string;
  lastRun?: string;
  schedule?: string;
  startedAt?: string;
  stoppedAt?: string;
  nextRun?: string;
  lastError?: string;
  progress?: {
    evaluations?: {
      topics?: number;
      posts?: number;
      threads?: number;
    };
  };
  totalDocuments?: number;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

interface CrawlerStatusItem {
  forumName: string;
  status: string;
  lastRun?: string;
  startTime?: string;
  lastError?: string;
  progress?: {
    totalDocuments?: number;
    topics?: number;
    posts?: number;
    threads?: number;
  };
}

interface ForumStatusData {
  status?: string;
  lastRun?: string;
  progress?: Record<string, unknown>;
  totalDocuments?: number;
}

// Utility function to format date as time ago
const formatTimeAgo = (dateString: string): string => {
  if (!dateString || dateString === 'Never') return 'Never';

  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Check if the date is valid
    if (isNaN(date.getTime())) return dateString;

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;

    return `${Math.floor(diffInSeconds / 31536000)} years ago`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

// Utility function to format progress data
const formatProgress = (progressData: Record<string, unknown> | string | null): React.ReactNode => {
  if (!progressData) return <span>-</span>;

  try {
    // If it's a string (JSON), parse it
    const progress = typeof progressData === 'string' ? JSON.parse(progressData) : progressData;

    // Format based on available fields
    return (
      <div className="text-xs">
        {progress.totalDocuments !== undefined && <div>Documents: {progress.totalDocuments}</div>}
        {progress.topics !== undefined && <div>Topics: {progress.topics}</div>}
        {progress.posts !== undefined && <div>Posts: {progress.posts}</div>}
        {progress.threads !== undefined && <div>Threads: {progress.threads}</div>}
        {progress.evaluations && (
          <>
            {progress.evaluations.topics !== undefined && (
              <div>Topics: {progress.evaluations.topics}</div>
            )}
            {progress.evaluations.posts !== undefined && (
              <div>Posts: {progress.evaluations.posts}</div>
            )}
            {progress.evaluations.threads !== undefined && (
              <div>Threads: {progress.evaluations.threads}</div>
            )}
          </>
        )}
        {Object.keys(progress).length === 0 && <span>-</span>}
      </div>
    );
  } catch (error) {
    console.error('Error formatting progress:', error);
    return <span>{String(progressData)}</span>;
  }
};

export default function ForumsCrawlerPage() {
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningCrawlers, setRunningCrawlers] = useState<Record<string, boolean>>({});
  const [refreshInterval, setRefreshInterval] = useState<number>(60000); // 60 seconds by default

  // Function to fetch crawler status
  const fetchCrawlerStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await crawlerApi.getAllStatus();

      // Direct response format (no nested data property)
      if (response?.statuses && Array.isArray(response.statuses)) {
        // Handle the actual response format with 'statuses' array
        const formattedCrawlers: Crawler[] = response.statuses.map(
          (status: CrawlerStatusItem, index: number) => {
            return {
              id: index + 1,
              name: status.forumName,
              url: `https://${status.forumName.toLowerCase().replace(/\s+/g, '')}.org`,
              status:
                status.status === 'running' || status.status === 'completed'
                  ? 'Active'
                  : status.status === 'error' || status.status === 'failed'
                    ? 'Error'
                    : 'Inactive',
              lastRun: status.startTime || status.lastRun || 'Never',
              nextRun: 'Not scheduled',
              lastError: status.lastError || '',
              progress: '',
              rawProgress: status.progress || null,
              docsCollected: status.progress?.totalDocuments || 0,
              schedule: 'Every 6 hours',
            };
          }
        );

        setCrawlers(formattedCrawlers);
      }
      // Legacy formats - these are kept for backward compatibility but likely won't be used
      else if (
        response &&
        'data' in response &&
        response.data &&
        typeof response.data === 'object'
      ) {
        // Check for nested data.data.forums structure
        if (
          'data' in response.data &&
          response.data.data &&
          typeof response.data.data === 'object' &&
          'forums' in response.data.data &&
          response.data.data.forums
        ) {
          const forums = response.data.data.forums as Record<string, unknown>;
          const formattedCrawlers: Crawler[] = Object.entries(forums).map(
            ([forumName, rawData], index) => {
              // Safe type casting
              const data = rawData as {
                status?: string;
                lastRun?: string;
                isRunning?: boolean;
              };

              return {
                id: index + 1,
                name: forumName,
                url: `https://${forumName.toLowerCase().replace(/\s+/g, '')}.org`,
                status:
                  data.status === 'running' || data.status === 'completed'
                    ? 'Active'
                    : data.status === 'error' || data.status === 'failed'
                      ? 'Error'
                      : 'Inactive',
                lastRun: data.lastRun || 'Never',
                nextRun: 'Not scheduled',
                lastError: '',
                progress: '',
                rawProgress: null,
                docsCollected: 0,
                schedule: 'Every 6 hours',
              };
            }
          );

          setCrawlers(formattedCrawlers);
        }
        // Check for direct data object format
        else if ('data' in response.data && response.data.data) {
          const dataObject = response.data.data as Record<string, unknown>;
          const formattedCrawlers: Crawler[] = Object.entries(dataObject).map(
            ([name, rawData], index) => {
              // Type assertion to handle the unknown type from Object.entries
              const data = rawData as unknown as CrawlerApiData;

              return {
                id: index + 1,
                name: name,
                url: data.url || `https://${name.toLowerCase().replace(/\s+/g, '')}.org`,
                status:
                  data.status === 'running' || data.status === 'completed'
                    ? 'Active'
                    : data.status === 'error' || data.status === 'failed'
                      ? 'Error'
                      : 'Inactive',
                lastRun: data.lastRun || data.startedAt || 'Never',
                nextRun: data.nextRun || 'Not scheduled',
                lastError: data.lastError || '',
                progress: '',
                rawProgress: data.progress || null,
                docsCollected: data.totalDocuments || 0,
                schedule: data.schedule || 'Every 6 hours',
              };
            }
          );

          setCrawlers(formattedCrawlers);
        } else {
          setError('Failed to load crawler data: Unexpected response format');
          console.error('Unexpected response format:', response);
        }
      } else {
        setError('Failed to load crawler data: Unexpected response format');
        console.error('Unexpected response format:', response);
      }
    } catch (err) {
      console.error('Error fetching crawler status:', err);
      setError('Failed to fetch crawler status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Function to get status for a specific forum
  const fetchForumStatus = async (forumName: string) => {
    try {
      const response = await crawlerApi.getForumStatus(forumName);

      if (response?.data) {
        // Update the specific crawler in the array
        const forumData = response.data as ForumStatusData;
        updateCrawlerDetails(forumName, forumData);
      }
    } catch (err) {
      console.error(`Error fetching status for ${forumName}:`, err);
      // Don't set global error for a single forum fetch failure
    }
  };

  // Function to update crawler status from API response
  const updateCrawlerStatus = async (forumName: string, status: string) => {
    setCrawlers(prevCrawlers => {
      return prevCrawlers.map(crawler => {
        if (crawler.name === forumName) {
          return {
            ...crawler,
            status:
              status === 'running' || status === 'completed'
                ? 'Active'
                : status === 'error' || status === 'failed'
                  ? 'Error'
                  : 'Inactive',
          };
        }
        return crawler;
      });
    });
  };

  // Function to update crawler details from API response
  const updateCrawlerDetails = async (forumName: string, forumData: ForumStatusData) => {
    setCrawlers(prevCrawlers => {
      return prevCrawlers.map(crawler => {
        if (crawler.name === forumName) {
          return {
            ...crawler,
            status:
              forumData.status === 'running' || forumData.status === 'completed'
                ? 'Active'
                : forumData.status === 'error' || forumData.status === 'failed'
                  ? 'Error'
                  : 'Inactive',
            lastRun: forumData.lastRun || crawler.lastRun,
            nextRun: crawler.nextRun,
            lastError: crawler.lastError,
            progress: '',
            rawProgress: forumData.progress || null,
            docsCollected: forumData.totalDocuments || crawler.docsCollected,
          };
        }
        return crawler;
      });
    });
  };

  // Function to handle starting a crawler
  const handleStartCrawler = async (forumName: string) => {
    try {
      setRunningCrawlers(prev => ({ ...prev, [forumName]: true }));
      const response = await crawlerApi.startForumCrawler(forumName);

      if (response?.data?.message) {
        // Update the crawler status to active
        updateCrawlerStatus(forumName, 'running');

        // Fetch the latest status after a short delay
        setTimeout(() => {
          fetchForumStatus(forumName);
        }, 2000);
      }
    } catch (err) {
      console.error(`Error starting crawler for ${forumName}:`, err);
      setError(
        `Failed to start crawler for ${forumName}. ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setRunningCrawlers(prev => ({ ...prev, [forumName]: false }));
    }
  };

  // Function to handle stopping a crawler
  const handleStopCrawler = async (forumName: string) => {
    try {
      setRunningCrawlers(prev => ({ ...prev, [forumName]: true }));
      const response = await crawlerApi.stopForumCrawler(forumName);

      if (response?.data?.message) {
        // Update the crawler status to inactive
        updateCrawlerStatus(forumName, 'inactive');

        // Fetch the latest status after a short delay
        setTimeout(() => {
          fetchForumStatus(forumName);
        }, 2000);
      }
    } catch (err) {
      console.error(`Error stopping crawler for ${forumName}:`, err);
      setError(
        `Failed to stop crawler for ${forumName}. ${err instanceof Error ? err.message : String(err)}`
      );
    } finally {
      setRunningCrawlers(prev => ({ ...prev, [forumName]: false }));
    }
  };

  // Function to handle starting all crawlers
  const handleStartAllCrawlers = async () => {
    try {
      setLoading(true);
      const response = await crawlerApi.startAllCrawlers();

      // The backend returns the response directly, not nested under 'data'
      if (response) {
        // Success notification can be added here
        await fetchCrawlerStatus();
      } else {
        throw new Error('Failed to start all crawlers: No response data');
      }
    } catch (err) {
      console.error('Error starting all crawlers:', err);

      // Check if it's a 409 Conflict error (crawlers already running)
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'status' in err.response &&
        err.response.status === 409 &&
        'data' in err.response
      ) {
        // Type assertion for the error data
        const errorData = err.response.data as {
          success: boolean;
          error: string;
          runningForums?: string[];
          timestamp: string;
        };

        const runningForums = errorData.runningForums || [];

        if (runningForums.length > 0) {
          setError(`Crawlers already running for: ${runningForums.join(', ')}`);
        } else {
          setError(
            errorData.error || 'Crawlers are already running. Please wait for them to complete.'
          );
        }

        // Refresh the status to show the running crawlers
        await fetchCrawlerStatus();
      } else {
        setError(
          `Failed to start all crawlers. ${err instanceof Error ? err.message : String(err)}`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to change refresh interval
  const changeRefreshInterval = (seconds: number) => {
    setRefreshInterval(seconds * 1000);
  };

  // Simple alert component for errors
  const Alert = ({ message }: { message: string }) => (
    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
      <h5 className="font-medium mb-1">Error</h5>
      <div>{message}</div>
      <div className="mt-2">
        <Button variant="outline" size="sm" onClick={() => setError(null)} className="text-xs">
          Dismiss
        </Button>
      </div>
    </div>
  );

  // Initial data fetch
  useEffect(() => {
    fetchCrawlerStatus();

    // Set up interval to refresh data
    const intervalId = setInterval(fetchCrawlerStatus, refreshInterval);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Loading state
  if (loading && crawlers.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Forum Crawlers</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading crawler data...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Forum Crawlers</h1>
          <div className="flex gap-2">
            <Button onClick={handleStartAllCrawlers} disabled={loading}>
              {loading ? 'Starting...' : 'Start All Crawlers'}
            </Button>
            <Button onClick={fetchCrawlerStatus} variant="outline" disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
            <div className="relative">
              <select
                className="bg-transparent border rounded px-3 py-2 text-sm"
                value={refreshInterval / 1000}
                onChange={e => changeRefreshInterval(Number(e.target.value))}
              >
                <option value="30">Auto-refresh: 30s</option>
                <option value="60">Auto-refresh: 1m</option>
                <option value="300">Auto-refresh: 5m</option>
                <option value="0">Auto-refresh: Off</option>
              </select>
            </div>
          </div>
        </div>

        {error && <Alert message={error} />}

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
              <div className="text-2xl font-bold">
                {crawlers.filter(c => c.status === 'Active').length}
              </div>
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
              <div className="text-2xl font-bold">
                {crawlers.filter(c => c.status === 'Error').length}
              </div>
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
                    <th className="text-right py-3 px-2">Next Run</th>
                    <th className="text-right py-3 px-2">Last Error</th>
                    <th className="text-right py-3 px-2">Progress</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {crawlers.length > 0
                    ? crawlers.map(crawler => (
                        <tr key={crawler.id} className="border-b">
                          <td className="py-3 px-2 font-medium">{crawler.name}</td>
                          <td className="py-3 px-2 text-sm text-muted-foreground">
                            <a
                              href={crawler.url}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline"
                            >
                              {crawler.url}
                            </a>
                          </td>
                          <td className="py-3 px-2">
                            <span
                              className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                crawler.status === 'Active'
                                  ? 'bg-green-100 text-green-800'
                                  : crawler.status === 'Inactive'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {crawler.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right">
                            {crawler.docsCollected.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right text-sm">
                            {formatTimeAgo(crawler.lastRun)}
                          </td>
                          <td className="py-3 px-2 text-right text-sm">{crawler.nextRun}</td>
                          <td className="py-3 px-2 text-right text-sm">{crawler.lastError}</td>
                          <td className="py-3 px-2 text-right text-sm">
                            {formatProgress(crawler.rawProgress || crawler.progress)}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex justify-end space-x-2">
                              {crawler.status === 'Active' ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStopCrawler(crawler.name)}
                                  disabled={runningCrawlers[crawler.name]}
                                >
                                  {runningCrawlers[crawler.name] ? 'Processing...' : 'Stop'}
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleStartCrawler(crawler.name)}
                                  disabled={runningCrawlers[crawler.name]}
                                >
                                  {runningCrawlers[crawler.name] ? 'Processing...' : 'Run Now'}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => fetchForumStatus(crawler.name)}
                                title="Refresh this crawler's status"
                              >
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                  />
                                </svg>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    : !loading && (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-muted-foreground">
                            No crawlers found. Try refreshing the data or contact an administrator.
                          </td>
                        </tr>
                      )}
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
