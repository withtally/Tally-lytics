'use client';

import { Button } from '../../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../../components/common/Card';
import { Layout } from '../../../components/common/Layout';

export default function NewsCollectionPage() {
  // Mock data for news sources
  const newsSources = [
    { 
      id: 1, 
      name: 'CoinDesk', 
      url: 'https://www.coindesk.com',
      status: 'Active',
      lastCrawl: '2025-03-13 16:45:22',
      articlesCollected: 845,
      frequency: 'Every 2 hours'
    },
    { 
      id: 2, 
      name: 'The Block', 
      url: 'https://www.theblock.co',
      status: 'Active',
      lastCrawl: '2025-03-13 15:30:17',
      articlesCollected: 623,
      frequency: 'Every 2 hours'
    },
    { 
      id: 3, 
      name: 'Decrypt', 
      url: 'https://decrypt.co',
      status: 'Active',
      lastCrawl: '2025-03-13 17:12:05',
      articlesCollected: 731,
      frequency: 'Every 2 hours'
    },
    { 
      id: 4, 
      name: 'The Defiant', 
      url: 'https://thedefiant.io',
      status: 'Inactive',
      lastCrawl: '2025-03-12 21:45:31',
      articlesCollected: 458,
      frequency: 'Every 4 hours'
    },
    { 
      id: 5, 
      name: 'Bankless', 
      url: 'https://newsletter.banklesshq.com',
      status: 'Error',
      lastCrawl: '2025-03-13 10:22:16',
      articlesCollected: 312,
      frequency: 'Every 6 hours'
    },
  ];

  // Mock data for recent articles
  const recentArticles = [
    {
      id: 1,
      title: 'MakerDAO Votes to Increase DAI Stability Fee',
      source: 'CoinDesk',
      publishDate: '2025-03-13 12:45:18',
      daos: ['MakerDAO'],
      relevanceScore: 0.92
    },
    {
      id: 2,
      title: 'Uniswap Governance Approves v4 Upgrade Proposal',
      source: 'The Block',
      publishDate: '2025-03-13 14:22:05',
      daos: ['Uniswap'],
      relevanceScore: 0.89
    },
    {
      id: 3,
      title: 'Aave Integrates New Risk Management Framework',
      source: 'Decrypt',
      publishDate: '2025-03-13 10:18:37',
      daos: ['Aave'],
      relevanceScore: 0.85
    },
    {
      id: 4,
      title: 'DAO Treasuries Face Market Volatility: Analysis',
      source: 'The Defiant',
      publishDate: '2025-03-12 19:05:22',
      daos: ['MakerDAO', 'Uniswap', 'Aave', 'Compound'],
      relevanceScore: 0.78
    },
    {
      id: 5,
      title: 'New Security Standards for DeFi Governance',
      source: 'CoinDesk',
      publishDate: '2025-03-13 08:30:14',
      daos: ['Compound', 'Aave'],
      relevanceScore: 0.81
    },
  ];

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">News Collection</h1>
          <Button>Add News Source</Button>
        </div>

        {/* News Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">News Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{newsSources.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {newsSources.filter(src => src.status === 'Active').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Articles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {newsSources.reduce((acc, curr) => acc + curr.articlesCollected, 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-muted-foreground">2025-03-13 17:12:05</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Articles */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Articles</CardTitle>
            <CardDescription>Latest news articles collected</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {recentArticles.map((article) => (
                <div key={article.id} className="border-b pb-4">
                  <h3 className="text-base font-medium mb-1">{article.title}</h3>
                  <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-2 mb-2">
                    <span>{article.source}</span>
                    <span>•</span>
                    <span>{article.publishDate}</span>
                    <span>•</span>
                    <span>Relevance: {(article.relevanceScore * 100).toFixed(0)}%</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {article.daos.map(dao => (
                      <span key={dao} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {dao}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline">View All Articles</Button>
          </CardFooter>
        </Card>

        {/* News Sources */}
        <Card>
          <CardHeader>
            <CardTitle>News Sources</CardTitle>
            <CardDescription>Configure and monitor news collection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2">Source</th>
                    <th className="text-left py-3 px-2">URL</th>
                    <th className="text-left py-3 px-2">Status</th>
                    <th className="text-right py-3 px-2">Articles</th>
                    <th className="text-right py-3 px-2">Last Crawl</th>
                    <th className="text-right py-3 px-2">Frequency</th>
                    <th className="text-right py-3 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {newsSources.map((source) => (
                    <tr key={source.id} className="border-b">
                      <td className="py-3 px-2 font-medium">{source.name}</td>
                      <td className="py-3 px-2 text-sm text-muted-foreground">
                        <a href={source.url} target="_blank" rel="noreferrer" className="hover:underline">
                          {source.url}
                        </a>
                      </td>
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
                      <td className="py-3 px-2 text-right">{source.articlesCollected}</td>
                      <td className="py-3 px-2 text-right text-sm">{source.lastCrawl}</td>
                      <td className="py-3 px-2 text-right text-sm">{source.frequency}</td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" size="sm">Edit</Button>
                          <Button variant="outline" size="sm">Crawl Now</Button>
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
            <Button variant="outline">News Filtering Rules</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
