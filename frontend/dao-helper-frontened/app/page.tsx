'use client';

import { Button } from '../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/common/Card';
import { Layout } from '../components/common/Layout';

export default function Home() {
  return (
    <Layout>
      <div className="container mx-auto py-10">
        <h1 className="text-4xl font-bold mb-8">Tally-lytics Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Collection</CardTitle>
              <CardDescription>Manage crawlers and data sources</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Configure and monitor crawlers for forums, market data, and news sources.
              </p>
            </CardContent>
            <CardFooter>
              <Button>View Data Collection</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Search & Analysis</CardTitle>
              <CardDescription>Find and analyze DAO data</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Use universal search to find information across all indexed sources.
              </p>
            </CardContent>
            <CardFooter>
              <Button>Go to Search</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>System Health</CardTitle>
              <CardDescription>Monitor system status</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View health metrics, manage cron jobs, and check system logs.
              </p>
            </CardContent>
            <CardFooter>
              <Button>Check Health</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
