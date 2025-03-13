'use client';

import { Button } from '../../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';

export default function MarketDataPage() {
  // Mock data for market data sources
  const marketDataSources = [
    { 
      id: 1, 
      name: 'CoinGecko API', 
      type: 'Price Data',
      status: 'Active',
      lastUpdate: '2025-03-13 17:02:13',
      tokensTracked: 248,
      updateFrequency: 'Every 15 minutes' 
    },
    { 
      id: 2, 
      name: 'DefiLlama API', 
      type: 'TVL Data',
      status: 'Active',
      lastUpdate: '2025-03-13 17:00:05',
      protocolsTracked: 127,
      updateFrequency: 'Every 60 minutes' 
    },
    { 
      id: 3, 
      name: 'Etherscan API', 
      type: 'On-chain Data',
      status: 'Active',
      lastUpdate: '2025-03-13 16:35:22',
      networksTracked: 5,
      updateFrequency: 'Every 30 minutes' 
    },
    { 
      id: 4, 
      name: 'Dune Analytics', 
      type: 'Analytics Data',
      status: 'Inactive',
      lastUpdate: '2025-03-12 18:22:56',
      dashboardsTracked: 14,
      updateFrequency: 'Every 12 hours' 
    },
    { 
      id: 5, 
      name: 'Token Terminal', 
      type: 'Financial Metrics',
      status: 'Error',
      lastUpdate: '2025-03-13 08:45:12',
      metricsTracked: 32,
      updateFrequency: 'Every 6 hours' 
    },
  ];

  // Mock data for top tokens
  const topTokens = [
    { symbol: 'ETH', name: 'Ethereum', price: 4521.34, change24h: 2.4 },
    { symbol: 'BTC', name: 'Bitcoin', price: 63245.87, change24h: 1.2 },
    { symbol: 'UNI', name: 'Uniswap', price: 12.65, change24h: -1.8 },
    { symbol: 'AAVE', name: 'Aave', price: 145.32, change24h: 3.5 },
    { symbol: 'MKR', name: 'Maker', price: 2345.67, change24h: 0.7 },
  ];

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Market Data Dashboard</h1>
          <Button>Add Data Source</Button>
        </div>

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
              <div className="text-2xl font-bold">248</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Global Update</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-muted-foreground">2025-03-13 17:02:13</div>
            </CardContent>
          </Card>
        </div>

        {/* Top Tokens */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Top DAO Tokens</CardTitle>
            <CardDescription>Latest price data for major DAO governance tokens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Token</th>
                    <th className="text-right py-3 px-4">Price (USD)</th>
                    <th className="text-right py-3 px-4">24h Change</th>
                  </tr>
                </thead>
                <tbody>
                  {topTokens.map((token) => (
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
                        ${token.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={token.change24h >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                        </span>
                      </td>
                    </tr>
                  ))}
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
                  {marketDataSources.map((source) => (
                    <tr key={source.id} className="border-b">
                      <td className="py-3 px-2 font-medium">{source.name}</td>
                      <td className="py-3 px-2">{source.type}</td>
                      <td className="py-3 px-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          source.status === 'Active' 
                            ? 'bg-green-100 text-green-800' 
                            : source.status === 'Inactive' 
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                        }`}>
                          {source.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right text-sm">{source.lastUpdate}</td>
                      <td className="py-3 px-2 text-right text-sm">{source.updateFrequency}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">Configure</Button>
                          <Button variant="outline" size="sm">Update Now</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
