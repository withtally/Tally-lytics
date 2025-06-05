'use client';

import { useEffect, useState } from 'react';
import { Layout } from '../../components/common/Layout';
import { Button } from '../../components/common/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/common/Card';
import { crawlerApi } from '../../services/api';
import type { CrawlerStatusItem } from '../../services/api';

export default function CrawlersPage() {
  const [crawlerStatuses, setCrawlerStatuses] = useState<CrawlerStatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCrawlerStatus();
    const interval = setInterval(fetchCrawlerStatus, 1000); // Poll every 1 second
    return () => clearInterval(interval);
  }, []);

  const fetchCrawlerStatus = async () => {
    try {
      const response = await crawlerApi.getAllStatus();
      setCrawlerStatuses(response.statuses || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch crawler status:', err);
      setError('Failed to fetch crawler status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCrawler = async (forumName: string) => {
    setActionLoading(forumName);
    try {
      await crawlerApi.startForumCrawler(forumName);
      // Refresh status immediately
      await fetchCrawlerStatus();
    } catch (err) {
      console.error(`Failed to start crawler for ${forumName}:`, err);
      setError(`Failed to start crawler for ${forumName}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopCrawler = async (forumName: string) => {
    setActionLoading(forumName);
    try {
      await crawlerApi.stopForumCrawler(forumName);
      // Refresh status immediately
      await fetchCrawlerStatus();
    } catch (err) {
      console.error(`Failed to stop crawler for ${forumName}:`, err);
      setError(`Failed to stop crawler for ${forumName}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartAll = async () => {
    setActionLoading('all');
    try {
      await crawlerApi.startAllCrawlers();
      await fetchCrawlerStatus();
    } catch (err) {
      console.error('Failed to start all crawlers:', err);
      setError('Failed to start all crawlers');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopAll = async () => {
    setActionLoading('stop-all');
    try {
      await crawlerApi.stopAllCrawlers();
      await fetchCrawlerStatus();
    } catch (err) {
      console.error('Failed to stop all crawlers:', err);
      setError('Failed to stop all crawlers');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'text-green-600 bg-green-50';
      case 'idle':
        return 'text-gray-600 bg-gray-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const formatLastRun = (lastRun?: string) => {
    if (!lastRun) return 'Never';
    const date = new Date(lastRun);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const calculateProgress = (progress?: any) => {
    // Since we don't have totalDocuments in the current API response,
    // we'll show indeterminate progress for running crawlers
    return 0;
  };

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Forum Crawlers</h1>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={handleStopAll}
              disabled={actionLoading === 'stop-all'}
            >
              {actionLoading === 'stop-all' ? 'Stopping...' : 'Stop All Crawlers'}
            </Button>
            <Button
              onClick={handleStartAll}
              disabled={actionLoading === 'all'}
            >
              {actionLoading === 'all' ? 'Starting...' : 'Start All Crawlers'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {isLoading ? (
          <Card>
            <CardContent className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-500">Loading crawler status...</p>
            </CardContent>
          </Card>
        ) : crawlerStatuses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-gray-500">No crawlers configured</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {crawlerStatuses.map((crawler) => (
              <Card key={crawler.forumName}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{crawler.forumName}</CardTitle>
                      <CardDescription>
                        Last run: {formatLastRun(crawler.endTime)}
                      </CardDescription>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(crawler.status)}`}>
                      {crawler.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Progress Bar */}
                  {crawler.status === 'running' && crawler.progress && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{calculateProgress(crawler.progress)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${calculateProgress(crawler.progress)}%` }}
                        />
                      </div>
                      {crawler.progress.evaluations && (
                        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-gray-500">Topics</span>
                            <p className="font-medium">{parseInt(crawler.progress.evaluations.topics) || 0}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Posts</span>
                            <p className="font-medium">{parseInt(crawler.progress.evaluations.posts) || 0}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Threads</span>
                            <p className="font-medium">{parseInt(crawler.progress.evaluations.threads) || 0}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {crawler.lastError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-sm text-red-700">{crawler.lastError}</p>
                    </div>
                  )}

                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Total Documents</p>
                      <p className="text-lg font-semibold">
                        {crawler.progress?.evaluations 
                          ? (parseInt(crawler.progress.evaluations.topics) || 0) + 
                            (parseInt(crawler.progress.evaluations.posts) || 0) + 
                            (parseInt(crawler.progress.evaluations.threads) || 0)
                          : 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Processed</p>
                      <p className="text-lg font-semibold">
                        {crawler.progress?.evaluations 
                          ? (parseInt(crawler.progress.evaluations.topics) || 0) + 
                            (parseInt(crawler.progress.evaluations.posts) || 0) + 
                            (parseInt(crawler.progress.evaluations.threads) || 0)
                          : 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Start Time</p>
                      <p className="text-lg font-semibold">
                        {crawler.startTime ? new Date(crawler.startTime).toLocaleTimeString() : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Duration</p>
                      <p className="text-lg font-semibold">
                        {crawler.startTime && crawler.status === 'running'
                          ? `${Math.round((Date.now() - new Date(crawler.startTime).getTime()) / 60000)} min`
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {crawler.status === 'running' ? (
                      <Button
                        variant="destructive"
                        onClick={() => handleStopCrawler(crawler.forumName)}
                        disabled={actionLoading === crawler.forumName}
                      >
                        {actionLoading === crawler.forumName ? 'Stopping...' : 'Stop Crawler'}
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleStartCrawler(crawler.forumName)}
                        disabled={actionLoading === crawler.forumName}
                      >
                        {actionLoading === crawler.forumName ? 'Starting...' : 'Start Crawler'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}