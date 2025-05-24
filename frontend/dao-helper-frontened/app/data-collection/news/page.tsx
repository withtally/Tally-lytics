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
import { newsApi } from '../../../services/api';

// Define interface for news source
interface NewsSource {
  id: number;
  name: string;
  url: string;
  status: string;
  lastCrawl: string;
  articlesCollected: number;
  frequency: string;
}

// Define interface for news article
interface NewsArticle {
  id: number;
  title: string;
  source: string;
  publishDate: string;
  daos: string[];
  relevanceScore: number;
}

// Define interface for API news source
interface ApiNewsSource {
  name?: string;
  url?: string;
  status?: string;
  lastCrawl?: string;
  articlesCollected?: number;
  frequency?: string;
}

// Define interface for API news article
interface ApiNewsArticle {
  id?: string | number;
  title?: string;
  source?: string;
  publishDate?: string;
  daos?: string[];
  relevanceScore?: number;
}

// Define interface for API response
interface NewsDataResponse {
  sources?: ApiNewsSource[];
  articles?: ApiNewsArticle[];
  lastUpdate?: string;
  totalArticles?: number;
  error?: string;
}

export default function NewsCollectionPage() {
  const [newsSources, setNewsSources] = useState<NewsSource[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingForum, setProcessingForum] = useState<string | null>(null);
  const [forums] = useState<string[]>(['all', 'UNISWAP', 'COMPOUND', 'AAVE', 'MAKER']);
  const [selectedForum, setSelectedForum] = useState<string>('all');

  // Function to fetch news data for a specific forum
  const fetchNewsData = useCallback(async (forum: string = 'all') => {
    setLoading(true);
    setError('');
    try {
      const response = await newsApi.getNewsArticles(forum);

      if (response?.data) {
        const newsData = response.data as NewsDataResponse;

        // Process news sources if available
        if (newsData.sources && Array.isArray(newsData.sources)) {
          const formattedSources: NewsSource[] = newsData.sources.map((source, index) => ({
            id: index + 1,
            name: source.name || `News Source ${index + 1}`,
            url: source.url || `https://example.com/news${index}`,
            status: source.status || 'Inactive',
            lastCrawl: source.lastCrawl || 'Never',
            articlesCollected: source.articlesCollected || 0,
            frequency: source.frequency || 'Unknown',
          }));
          setNewsSources(formattedSources);
        }

        // Process articles if available
        if (newsData.articles && Array.isArray(newsData.articles)) {
          const formattedArticles: NewsArticle[] = newsData.articles.map((article, index) => ({
            id: typeof article.id === 'number' ? article.id : index + 1,
            title: article.title || 'Untitled Article',
            source: article.source || 'Unknown Source',
            publishDate: article.publishDate || new Date().toISOString(),
            daos: article.daos || [],
            relevanceScore: article.relevanceScore || 0.5,
          }));
          setNewsArticles(formattedArticles);
        } else if (Array.isArray(newsData)) {
          // Handle the case where the response is an array directly
          const formattedArticles: NewsArticle[] = newsData.map((article, index) => ({
            id: typeof article.id === 'number' ? article.id : index + 1,
            title: article.title || 'Untitled Article',
            source: article.source || 'Unknown Source',
            publishDate: article.publishDate || new Date().toISOString(),
            daos: article.daos || [],
            relevanceScore: article.relevanceScore || 0.5,
          }));
          setNewsArticles(formattedArticles);
        } else {
          // If no articles are found, set empty array
          setNewsArticles([]);
        }
      } else if (response?.error) {
        // Handle API error response
        setError(response.error || 'Failed to fetch news articles');
        // Set empty arrays for sources and articles
        setNewsSources([]);
        setNewsArticles([]);
      }
    } catch (err) {
      console.error('Error fetching news data:', err);
      setError('Failed to fetch news articles. Please try again later.');
      // Set empty arrays for sources and articles
      setNewsSources([]);
      setNewsArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Function to trigger a news crawl
  const triggerNewsCrawl = async () => {
    try {
      setProcessingForum(selectedForum);
      const response = await newsApi.triggerNewsCrawl();

      if (response?.data) {
        // If successful, fetch the updated data after a delay to allow for processing
        setTimeout(() => {
          fetchNewsData(selectedForum);
          setProcessingForum(null);
        }, 2000);
      } else if (response?.error) {
        throw new Error(response.error);
      } else {
        throw new Error('Failed to trigger news crawl: No response data');
      }
    } catch (err) {
      console.error('Error triggering news crawl:', err);
      setError(
        `Failed to trigger news crawl: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
      setProcessingForum(null);
    }
  };

  // Function to handle forum selection change
  const handleForumChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const forum = event.target.value;
    setSelectedForum(forum);
    fetchNewsData(forum);
  };

  // Initial data fetch
  useEffect(() => {
    fetchNewsData(selectedForum);

    // Set up auto-refresh interval (every 5 minutes)
    const intervalId = setInterval(
      () => {
        fetchNewsData(selectedForum);
      },
      5 * 60 * 1000
    );

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [selectedForum, fetchNewsData]);

  // Loading state
  if (loading && newsSources.length === 0 && newsArticles.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">News Collection</h1>
          </div>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading news data...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

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

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">News Collection</h1>
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
            <Button
              onClick={triggerNewsCrawl}
              disabled={loading || processingForum === selectedForum}
            >
              {processingForum === selectedForum
                ? 'Processing...'
                : loading
                  ? 'Loading...'
                  : 'Update News Data'}
            </Button>
            <Button
              variant="outline"
              onClick={() => fetchNewsData(selectedForum)}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {error && <Alert message={error} />}

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
              <div className="text-2xl font-bold">{newsArticles.length.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Update</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium text-muted-foreground">
                {new Date().toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Articles */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Articles</CardTitle>
            <CardDescription>
              Latest news articles collected
              {selectedForum !== 'all' && ` - ${selectedForum.toUpperCase()}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {newsArticles.length > 0 ? (
                newsArticles.map(article => (
                  <div key={article.id} className="border-b pb-4">
                    <h3 className="text-base font-medium mb-1">{article.title}</h3>
                    <div className="flex flex-wrap items-center text-sm text-muted-foreground gap-2 mb-2">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>{new Date(article.publishDate).toLocaleString()}</span>
                      <span>•</span>
                      <span>Relevance: {(article.relevanceScore * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {article.daos.map(dao => (
                        <span
                          key={dao}
                          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                        >
                          {dao}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-muted-foreground">
                  No articles available. Try refreshing or selecting a different forum.
                </div>
              )}
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
                  {newsSources.length > 0 ? (
                    newsSources.map(source => (
                      <tr key={source.id} className="border-b">
                        <td className="py-3 px-2 font-medium">{source.name}</td>
                        <td className="py-3 px-2 text-sm text-muted-foreground">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {source.url}
                          </a>
                        </td>
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
                        <td className="py-3 px-2 text-right">{source.articlesCollected}</td>
                        <td className="py-3 px-2 text-right text-sm">
                          {new Date(source.lastCrawl).toLocaleString()}
                        </td>
                        <td className="py-3 px-2 text-right text-sm">{source.frequency}</td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={triggerNewsCrawl}
                              disabled={processingForum === selectedForum}
                            >
                              {processingForum === selectedForum ? 'Processing...' : 'Crawl Now'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-muted-foreground">
                        No news sources available. Try refreshing or contact an administrator.
                      </td>
                    </tr>
                  )}
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
