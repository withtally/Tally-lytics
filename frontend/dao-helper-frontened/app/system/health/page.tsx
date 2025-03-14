'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';
import { healthApi } from '../../../services/api';

// Define interfaces for our data types
interface HealthData {
  status: string;
  timestamp: string;
  services: {
    crawler: {
      status: string;
      activeJobs?: Array<{
        forumName: string;
        status: string;
        progress?: Record<string, unknown>;
        startTime?: string;
        endTime?: string;
        lastError?: string;
      }>;
    };
    search: {
      status: string;
    };
  };
}

interface SystemComponent {
  id: number;
  name: string;
  status: string;
  lastChecked: string;
  uptime?: string;
  responseTime?: string;
  loadAverage?: string;
  connectionCount?: number;
  queryTime?: string;
  activeJobs?: number;
  queuedJobs?: number;
  failedJobs?: number;
  indexSize?: string;
  queryCount?: string;
  averageQueryTime?: string;
}

interface Alert {
  id: number;
  component: string;
  level: string;
  message: string;
  timestamp: string;
}

interface SystemHealthData {
  status: string;
  timestamp: string;
  services: {
    crawler: {
      status: string;
      activeJobs?: Array<{
        forumName: string;
        status: string;
        progress?: Record<string, unknown>;
        startTime?: string;
        endTime?: string;
        lastError?: string;
      }>;
    };
    search: {
      status: string;
    };
  };
}

// Create a simple Alert component since it's missing
const Alert = ({ 
  variant, 
  className, 
  children 
}: { 
  variant?: 'default' | 'destructive'; 
  className?: string; 
  children: React.ReactNode 
}) => {
  return (
    <div className={`p-4 rounded-md border ${
      variant === 'destructive' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'
    } ${className || ''}`}>
      {children}
    </div>
  );
};

const AlertTitle = ({ children }: { children: React.ReactNode }) => {
  return <h5 className="font-medium mb-1">{children}</h5>;
};

const AlertDescription = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>;
};

export default function SystemHealthPage() {
  const [timeRange, setTimeRange] = useState('24h');
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string>(new Date().toLocaleString());

  // Time range options
  const timeRangeOptions = [
    { id: '1h', label: '1 Hour' },
    { id: '24h', label: '24 Hours' },
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
  ];

  // Function to fetch health data
  const fetchHealthData = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('=== HEALTH PAGE: Starting health data fetch ===');
      // The healthApi.getSystemHealth() now returns the full axios response
      const response = await healthApi.getSystemHealth();
      
      console.log('=== HEALTH PAGE: Raw response received ===');
      console.log('Response type:', typeof response);
      console.log('Response structure:', Object.keys(response || {}));
      
      // Deep inspect the response
      if (response) {
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (response.data) {
          console.log('=== HEALTH PAGE: Response data inspection ===');
          console.log('Data type:', typeof response.data);
          console.log('Data structure:', Object.keys(response.data || {}));
          console.log('Is data an array?', Array.isArray(response.data));
          console.log('Stringified data:', JSON.stringify(response.data, null, 2).substring(0, 500) + '...');
          
          // Check for common properties
          console.log('Has status?', 'status' in response.data);
          console.log('Has services?', 'services' in response.data);
          console.log('Has data property?', 'data' in response.data);
          console.log('Has success property?', 'success' in response.data);
          
          // Try to access data if it's directly in response.data (not wrapped in ApiResponse)
          if ('status' in response.data && 'services' in response.data) {
            console.log('=== HEALTH PAGE: Direct data format detected ===');
            const directData = response.data as unknown as SystemHealthData;
            console.log('Status:', directData.status);
            console.log('Services:', directData.services);
            
            const transformedData: HealthData = {
              status: directData.status || 'unknown',
              timestamp: directData.timestamp || new Date().toISOString(),
              services: directData.services || {
                crawler: { status: 'unknown' },
                search: { status: 'unknown' }
              }
            };
            setHealthData(transformedData);
            setLastChecked(new Date().toLocaleString());
          }
          // Then try nested data format (wrapped in ApiResponse)
          else if ('data' in response.data && response.data.data) {
            console.log('=== HEALTH PAGE: Nested data format detected ===');
            const nestedData = response.data.data as SystemHealthData;
            console.log('Nested data type:', typeof nestedData);
            console.log('Nested data structure:', Object.keys(nestedData || {}));
            console.log('Nested data has status?', 'status' in nestedData);
            console.log('Nested data has services?', 'services' in nestedData);
            
            const transformedData: HealthData = {
              status: nestedData.status || 'unknown',
              timestamp: nestedData.timestamp || new Date().toISOString(),
              services: nestedData.services || {
                crawler: { status: 'unknown' },
                search: { status: 'unknown' }
              }
            };
            setHealthData(transformedData);
            setLastChecked(new Date().toLocaleString());
          } else {
            console.error('=== HEALTH PAGE: Invalid response format ===', JSON.stringify(response.data));
            throw new Error('Invalid response format from health API');
          }
        } else {
          console.error('=== HEALTH PAGE: No data in response ===');
          throw new Error('No data received from health API');
        }
      } else {
        console.error('=== HEALTH PAGE: Empty response ===');
        throw new Error('Empty response from health API');
      }
    } catch (err) {
      console.error('=== HEALTH PAGE: Error fetching health data ===', err);
      
      // Provide more helpful error messages based on error type
      const error = err as { 
        code?: string; 
        response?: { 
          status?: number; 
          data?: { message?: string } 
        } 
      };
      
      if (error.code === 'ERR_NETWORK') {
        setError('Network error: Unable to connect to the API server. This may be due to CORS restrictions when running locally. Please check your network connection or try again later.');
      } else if (error.response && error.response.status) {
        setError(`API error (${error.response.status}): ${error.response.data?.message || 'Unknown error'}`);
      } else {
        setError(`Failed to fetch system health data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchHealthData();
    const intervalId = setInterval(fetchHealthData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  // Parse system components from API data
  const getSystemComponents = (): SystemComponent[] => {
    if (!healthData) return [];
    
    const components: SystemComponent[] = [
      {
        id: 1,
        name: 'API Server',
        status: healthData.status === 'ok' ? 'Healthy' : 'Warning',
        lastChecked: lastChecked
      },
      // NOTE: Database component hidden until API endpoint is created
      /*
      {
        id: 2,
        name: 'Database',
        status: 'Healthy',
        lastChecked: lastChecked
      }
      */
    ];

    if (healthData.services?.crawler) {
      const crawlerService = healthData.services.crawler;
      const activeJobs = crawlerService.activeJobs || [];
      
      components.push({
        id: 3,
        name: 'Web Crawlers',
        status: crawlerService.status === 'running' ? 'Healthy' : 'Warning',
        activeJobs: activeJobs.length,
        failedJobs: activeJobs.filter((job) => job.status === 'failed').length,
        lastChecked: lastChecked
      });
    }

    if (healthData.services?.search) {
      components.push({
        id: 4,
        name: 'Search Engine',
        status: healthData.services.search.status === 'running' ? 'Healthy' : 'Warning',
        lastChecked: lastChecked
      });
    }

    return components;
  };

  // Generate alerts from API data
  const getRecentAlerts = (): Alert[] => {
    if (!healthData) return [];
    
    const alerts: Alert[] = [];
    
    if (healthData.status !== 'ok') {
      alerts.push({
        id: 1,
        component: 'System',
        level: 'Warning',
        message: `System health check returned status: ${healthData.status}`,
        timestamp: new Date(healthData.timestamp).toLocaleString()
      });
    }
    
    if (healthData.services?.crawler?.activeJobs) {
      healthData.services.crawler.activeJobs.forEach((job, index) => {
        if (job.status === 'failed') {
          alerts.push({
            id: 10 + index,
            component: 'Web Crawlers',
            level: 'Warning',
            message: `Crawler job for ${job.forumName} forums failed: ${job.lastError || 'Unknown error'}`,
            timestamp: job.endTime ? new Date(job.endTime).toLocaleString() : new Date().toLocaleString()
          });
        }
      });
    }
    
    return alerts;
  };

  const systemComponents = getSystemComponents();
  const recentAlerts = getRecentAlerts();

  // Handle manual refresh
  const handleRefresh = () => {
    fetchHealthData();
  };

  if (loading && !healthData) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">System Health</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading system health data...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">System Health</h1>
          </div>
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={handleRefresh}>Retry</Button>
          </div>
        </div>
      </Layout>
    );
  }

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
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh Now'}
            </Button>
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
                <div className="text-2xl font-bold">
                  {systemComponents.some(c => c.status === 'Critical') 
                    ? 'Critical' 
                    : systemComponents.some(c => c.status === 'Warning') 
                      ? 'Warning' 
                      : 'Healthy'}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last checked: {lastChecked || 'Never'}
              </p>
            </CardContent>
          </Card>
          
          {/* NOTE: Time range selector functionality is currently hardcoded and doesn't affect data */}
          {/* It's hidden until the API endpoint is created to support historical data */}
          {/* 
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">99.98%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Last 30 days
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">120ms</div>
              <p className="text-xs text-muted-foreground mt-1">
                Average over last hour
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthData?.services?.crawler?.activeJobs?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently running
              </p>
            </CardContent>
          </Card>
          */}
          
          {/* Only show the active jobs card since it's based on real data */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {healthData?.services?.crawler?.activeJobs?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently running
              </p>
            </CardContent>
          </Card>
        </div>

        {/* System Components */}
        <h2 className="text-xl font-semibold mb-4">System Components</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {systemComponents.map((component) => (
            <Card key={component.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-medium">{component.name}</CardTitle>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    component.status === 'Healthy' 
                      ? 'bg-green-100 text-green-800' 
                      : component.status === 'Warning' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {component.status}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {component.lastChecked && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Last Checked:</span>
                      <span>{component.lastChecked}</span>
                    </div>
                  )}
                  {component.activeJobs !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Active Jobs:</span>
                      <span>{component.activeJobs}</span>
                    </div>
                  )}
                  {component.failedJobs !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Failed Jobs:</span>
                      <span>{component.failedJobs}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Web Crawler Jobs Table */}
        {healthData?.services?.crawler?.activeJobs && healthData.services.crawler.activeJobs.length > 0 && (
          <>
            <h2 className="text-xl font-semibold mb-4">Web Crawler Jobs</h2>
            <Card className="mb-8">
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 w-1/6">Forum</th>
                        <th className="text-left py-3 px-4 w-1/6">Status</th>
                        <th className="text-left py-3 px-4 w-1/6">Start Time</th>
                        <th className="text-left py-3 px-4 w-1/6">End Time</th>
                        <th className="text-left py-3 px-4 w-2/6">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthData.services.crawler.activeJobs.map((job, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4 font-medium text-xs">{job.forumName}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              job.status === 'running' 
                                ? 'bg-blue-100 text-blue-800' 
                                : job.status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : job.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}>
                              {job.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs max-w-xs break-words" style={{ fontSize: '0.7rem' }}>
                            {job.startTime ? new Date(job.startTime).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-3 px-4 text-xs max-w-xs break-words" style={{ fontSize: '0.7rem' }}>
                            {job.endTime ? new Date(job.endTime).toLocaleString() : 'In progress'}
                          </td>
                          <td className="py-3 px-4 text-xs text-red-600 max-w-md break-words whitespace-pre-wrap" data-component-name="SystemHealthPage" style={{ fontSize: '0.65rem' }}>
                            {job.lastError || 'None'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        
        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>System alerts and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No alerts to display. All systems operating normally.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Level</th>
                      <th className="text-left py-3 px-4">Component</th>
                      <th className="text-left py-3 px-4">Message</th>
                      <th className="text-right py-3 px-4">Timestamp</th>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            {/* NOTE: These buttons currently have no functionality */}
            {/* Uncomment when API endpoints are created to support these features */}
            {/*
            <Button variant="outline">Export Alerts</Button>
            <Button variant="outline">Configure Alert Rules</Button>
            */}
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
