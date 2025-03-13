'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';
import { crawlerApi } from '../../../services/api';

// Define interface for crawler data
interface Crawler {
  id: number;
  name: string;
  url: string;
  status: string;
  lastRun: string;
  docsCollected: number;
  schedule: string;
}

// Define interface for API response
interface CrawlerApiData {
  url?: string;
  status?: string;
  lastRun?: string;
  totalDocuments?: number;
  schedule?: string;
  [key: string]: unknown;
}

export default function ForumsCrawlerPage() {
  const [crawlers, setCrawlers] = useState<Crawler[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningCrawlers, setRunningCrawlers] = useState<Record<string, boolean>>({});

  // Function to fetch crawler status
  const fetchCrawlerStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await crawlerApi.getAllStatus();
      
      if (response.data) {
        // Transform API data to match our UI needs
        const formattedCrawlers: Crawler[] = Object.entries(response.data).map((entry, index) => {
          const [name, dataRaw] = entry;
          // Type assertion to handle the unknown type from Object.entries
          const data = dataRaw as CrawlerApiData;
          
          return {
            id: index + 1,
            name: name,
            url: data.url || `https://${name.toLowerCase().replace(/\s+/g, '')}.org`,
            status: data.status === 'running' ? 'Active' : 
                   data.status === 'error' ? 'Error' : 'Inactive',
            lastRun: data.lastRun || 'Never',
            docsCollected: data.totalDocuments || 0,
            schedule: data.schedule || 'Every 6 hours'
          };
        });
        
        setCrawlers(formattedCrawlers);
      } else {
        setError('Failed to load crawler data');
      }
    } catch (err) {
      console.error('Error fetching crawler status:', err);
      setError('Failed to fetch crawler status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchCrawlerStatus();
    
    // Set up interval to refresh data every minute
    const intervalId = setInterval(fetchCrawlerStatus, 60000);
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle starting a crawler
  const handleStartCrawler = async (forumName: string) => {
    try {
      setRunningCrawlers(prev => ({ ...prev, [forumName]: true }));
      await crawlerApi.startForumCrawl(forumName);
      // Fetch updated status after starting the crawler
      await fetchCrawlerStatus();
    } catch (err) {
      console.error(`Error starting crawler for ${forumName}:`, err);
      setError(`Failed to start crawler for ${forumName}`);
    } finally {
      setRunningCrawlers(prev => ({ ...prev, [forumName]: false }));
    }
  };

  // Handle stopping a crawler
  const handleStopCrawler = async (forumName: string) => {
    try {
      setRunningCrawlers(prev => ({ ...prev, [forumName]: true }));
      await crawlerApi.stopForumCrawl(forumName);
      // Fetch updated status after stopping the crawler
      await fetchCrawlerStatus();
    } catch (err) {
      console.error(`Error stopping crawler for ${forumName}:`, err);
      setError(`Failed to stop crawler for ${forumName}`);
    } finally {
      setRunningCrawlers(prev => ({ ...prev, [forumName]: false }));
    }
  };

  // Handle starting all crawlers
  const handleStartAllCrawlers = async () => {
    try {
      await crawlerApi.startAllCrawls();
      // Fetch updated status after starting all crawlers
      await fetchCrawlerStatus();
    } catch (err) {
      console.error('Error starting all crawlers:', err);
      setError('Failed to start all crawlers');
    }
  };

  // Simple alert component for errors
  const Alert = ({ message }: { message: string }) => (
    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
      <h5 className="font-medium mb-1">Error</h5>
      <div>{message}</div>
    </div>
  );

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
            <Button onClick={handleStartAllCrawlers}>Start All Crawlers</Button>
            <Button onClick={fetchCrawlerStatus} variant="outline">
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
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
