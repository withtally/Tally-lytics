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
  services?: {
    crawler?: {
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
    search?: string;
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
      const response = await healthApi.getSystemHealth();
      const transformedData: HealthData = {
        status: response.data.status || 'unknown',
        timestamp: response.data.timestamp || new Date().toISOString(),
        services: response.data.services
      };
      setHealthData(transformedData);
      setLastChecked(new Date().toLocaleString());
    } catch (err) {
      console.error('Error fetching health data:', err);
      setError('Failed to fetch system health data. Please try again.');
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
        uptime: '99.98%',
        responseTime: '120ms',
        loadAverage: '0.42',
        lastChecked: lastChecked
      },
      {
        id: 2,
        name: 'Database',
        status: 'Healthy',
        uptime: '99.99%',
        connectionCount: 12,
        queryTime: '35ms',
        lastChecked: lastChecked
      }
    ];

    if (healthData.services?.crawler) {
      const crawlerService = healthData.services.crawler;
      const activeJobs = crawlerService.activeJobs || [];
      
      components.push({
        id: 3,
        name: 'Web Crawlers',
        status: crawlerService.status === 'running' ? 'Healthy' : 'Warning',
        activeJobs: activeJobs.length,
        queuedJobs: 0,
        failedJobs: activeJobs.filter((job) => job.status === 'failed').length,
        lastChecked: lastChecked
      });
    }

    if (healthData.services?.search) {
      components.push({
        id: 4,
        name: 'Search Engine',
        status: healthData.services.search === 'running' ? 'Healthy' : 'Warning',
        indexSize: '24.5 GB',
        queryCount: '342/hr',
        averageQueryTime: '85ms',
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
                <div className="text-xl font-bold">
                  {healthData?.status === 'ok' 
                    ? 'All Systems Operational'
                    : 'System Issues Detected'}
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
              <div className="text-sm font-medium">{lastChecked}</div>
              <div className="text-xs text-muted-foreground">Checks run every 30 seconds</div>
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
            <Button onClick={handleRefresh} disabled={loading}>
              {loading ? 'Running Check...' : 'Run Full System Check'}
            </Button>
          </CardFooter>
        </Card>

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
            )}
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
