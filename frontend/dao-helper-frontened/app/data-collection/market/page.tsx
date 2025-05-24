'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { marketCapApi } from '../../../services/api';

// Define interface for market data
interface MarketDataSource {
  id: number;
  name: string;
  type: string;
  status: string;
  lastUpdate: string;
  tokensTracked?: number;
  protocolsTracked?: number;
  networksTracked?: number;
  dashboardsTracked?: number;
  metricsTracked?: number;
  updateFrequency: string;
}

// Define interface for token data
interface TokenData {
  name: string;
  symbol: string;
  marketCap: number;
  price: number;
  volume: number;
  change24h: number;
  lastUpdated: string;
  forum?: string;
}

// Define interface for API data source
interface DataSource {
  name: string;
  url: string;
  lastUpdated: string;
  status: string;
}

// Define interface for API response
interface MarketDataResponse {
  data: Array<TokenData>;
  timestamp?: string;
  sources?: Array<DataSource>;
  tokens?: Array<TokenData>;
}

export default function MarketDataPage() {
  const [marketDataSources, setMarketDataSources] = useState<MarketDataSource[]>([]);
  const [topTokens, setTopTokens] = useState<TokenData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingForum, setProcessingForum] = useState<string | null>(null);
  const [forums] = useState<string[]>(['all', 'UNISWAP', 'COMPOUND', 'AAVE', 'MAKER']);
  const [selectedForum, setSelectedForum] = useState<string>('all');

  // Function to fetch market data for a specific forum
  const fetchMarketData = useCallback(async (forum: string = 'all') => {
    setLoading(true);
    setError('');
    try {
      const response = await marketCapApi.getMarketCapData(forum);
      if (response?.data) {
        const marketData = response.data as MarketDataResponse;

        // Process data sources if available
        if (marketData.sources && Array.isArray(marketData.sources)) {
          const formattedSources: MarketDataSource[] = marketData.sources.map((source, index) => ({
            id: index + 1,
            name: source.name || `Data Source ${index + 1}`,
            type: 'Unknown',
            status: source.status || 'Inactive',
            lastUpdate: source.lastUpdated || 'Never',
            updateFrequency: 'Unknown',
          }));
          setMarketDataSources(formattedSources);
        }

        // Process token data if available
        if (marketData.tokens && Array.isArray(marketData.tokens)) {
          setTopTokens(marketData.tokens);
        } else if (marketData.data && Array.isArray(marketData.data)) {
          // Handle the actual API response format where tokens are in the data array
          const formattedTokens: TokenData[] = marketData.data.map((token: TokenData) => ({
            name: token.name || 'Unknown',
            symbol: token.symbol || 'N/A',
            marketCap: token.marketCap || 0,
            price: token.price || 0,
            volume: token.volume || 0,
            change24h: token.change24h || 0,
            lastUpdated: token.lastUpdated || new Date().toISOString(),
            forum: token.forum || forum,
          }));
          setTopTokens(formattedTokens);
        } else {
          setTopTokens([]);
        }
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError('Failed to fetch market data. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to trigger a market data crawl
  const triggerMarketDataCrawl = async () => {
    try {
      setProcessingForum('all');
      const response = await marketCapApi.triggerMarketCapCrawl();

      if (response?.data) {
        // If successful, fetch the updated data after a delay to allow for processing
        setTimeout(() => {
          fetchMarketData(selectedForum);
          setProcessingForum(null);
        }, 2000);
      } else if (response?.error) {
        throw new Error(response.error);
      } else {
        throw new Error('Failed to trigger market data crawl: No response data');
      }
    } catch (err) {
      console.error('Error triggering market data crawl:', err);
      setError('Failed to trigger market data crawl. Please try again later.');
      setProcessingForum(null);
    }
  };

  // Function to handle forum selection change
  const handleForumChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const forum = event.target.value;
    setSelectedForum(forum);
    fetchMarketData(forum);
  };

  // Initial data fetch
  useEffect(() => {
    fetchMarketData(selectedForum);

    // Set up interval to refresh data every 5 minutes
    const intervalId = setInterval(() => fetchMarketData(selectedForum), 300000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [selectedForum, fetchMarketData]);

  // Loading state
  if (loading && marketDataSources.length === 0 && topTokens.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Market Data Dashboard</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading market data...</p>
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
          <h1 className="text-3xl font-bold">Market Data Dashboard</h1>
          <div className="flex gap-2 items-center">
            <div className="relative mr-2">
              <select
                className="bg-transparent border rounded px-3 py-2 text-sm"
                value={selectedForum}
                onChange={handleForumChange}
                disabled={loading}
              >
                <option value="all">All Forums</option>
                {forums.map(forum => (
                  <option key={forum} value={forum}>
                    {forum.charAt(0).toUpperCase() + forum.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={triggerMarketDataCrawl} disabled={loading || processingForum !== null}>
              {processingForum ? 'Processing...' : loading ? 'Loading...' : 'Update Market Data'}
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchMarketData(selectedForum)}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-md mb-6">
            <h5 className="font-medium mb-1">Error</h5>
            <div>{error}</div>
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setError(null)}
                className="text-xs"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Market Data Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Data Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{marketDataSources.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {marketDataSources.filter(src => src.status === 'Active').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tokens Tracked</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{topTokens.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Global Update</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-muted-foreground">
                {new Date().toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Tokens */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top DAO Tokens</CardTitle>
            <CardDescription>
              Latest price data for major DAO governance tokens
              {selectedForum !== 'all' && ` - ${selectedForum.toUpperCase()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Token</th>
                    <th className="text-right py-3 px-4">Price (USD)</th>
                    <th className="text-right py-3 px-4">24h Change</th>
                    <th className="text-right py-3 px-4">Market Cap</th>
                    <th className="text-right py-3 px-4">24h Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {topTokens.length > 0 ? (
                    topTokens.map(token => (
                      <tr key={token.symbol} className="border-b">
                        <td className="py-3 px-4">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                              {token.symbol.substring(0, 1)}
                            </div>
                            <div>
                              <div className="font-medium">{token.name}</div>
                              <div className="text-sm text-muted-foreground">{token.symbol}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          $
                          {token.price.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={token.change24h >= 0 ? 'text-green-600' : 'text-red-600'}
                          >
                            {token.change24h >= 0 ? '+' : ''}
                            {token.change24h.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          ${token.marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          ${token.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        No token data available. Try refreshing or selecting a different forum.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline">View All Tokens</Button>
          </CardFooter>
        </Card>

        {/* Market Data Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
            <CardDescription>Configure and monitor market data collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Source</th>
                    <th className="text-left py-3 px-2">Type</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-right py-3 px-2">Last Update</th>
                    <th className="text-right py-3 px-2">Update Frequency</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {marketDataSources.length > 0 ? (
                    marketDataSources.map(source => (
                      <tr key={source.id} className="border-b">
                        <td className="py-3 px-2 font-medium">{source.name}</td>
                        <td className="py-3 px-2">{source.type}</td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                              source.status === 'Active'
                                ? 'bg-green-100 text-green-800'
                                : source.status === 'Inactive'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {source.status}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right text-sm">
                          {new Date(source.lastUpdate).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right text-sm">{source.updateFrequency}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm">
                              Configure
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={triggerMarketDataCrawl}
                              disabled={processingForum !== null}
                            >
                              {processingForum ? 'Processing...' : 'Update Now'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        No data sources available. Try refreshing or contact an administrator.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Export Configuration</Button>
            <Button variant="outline">API Key Management</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
