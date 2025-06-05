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
import { postsApi, topicsApi } from '../../services/api';

interface Post {
  id: number;
  title: string;
  content: string;
  author: string;
  created_at: string;
  forum_name: string;
  topic_id: number;
  post_evaluation?: {
    quality_score: number;
    relevance_score: number;
    sentiment: string;
    summary: string;
  };
}

interface Topic {
  id: number;
  title: string;
  created_at: string;
  forum_name: string;
  posts_count: number;
  views: number;
  topic_evaluation?: {
    quality_score: number;
    relevance_score: number;
    summary: string;
  };
}

export default function ExplorePage() {
  const [activeTab, setActiveTab] = useState<'posts' | 'topics'>('posts');
  const [records, setRecords] = useState<(Post | Topic)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedForum, setSelectedForum] = useState<string>('all');
  const [forums, setForums] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    // Check backend connection on mount
    checkConnection();
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [activeTab, page, selectedForum]);

  useEffect(() => {
    // Reset page when changing tabs or forum
    setPage(1);
    setRecords([]);
  }, [activeTab, selectedForum]);

  const checkConnection = async () => {
    try {
      // Try to fetch a small amount of data to check connection
      await postsApi.getPosts({ page: 1, limit: 1 });
      setIsConnected(true);
    } catch (err) {
      setIsConnected(false);
    }
  };

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let response;
      
      if (activeTab === 'posts') {
        response = await postsApi.getPosts({
          page,
          limit: 20,
          forum: selectedForum === 'all' ? undefined : selectedForum,
          orderBy: 'created_at'
        });
      } else {
        response = await topicsApi.getTopics({
          page,
          limit: 20,
          forum: selectedForum === 'all' ? undefined : selectedForum,
          orderBy: 'created_at'
        });
      }

      // Check if response contains an error
      if (response.error) {
        setError(`${response.error}${response.details ? ': ' + response.details : ''}`);
        if (page === 1) {
          setRecords([]);
        }
        setHasMore(false);
        return;
      }

      // Handle the response - check if it has data property
      const recordsArray = response.data || [];
      const pagination = response.pagination;
      
      if (page === 1) {
        setRecords(recordsArray);
      } else {
        setRecords(prev => [...prev, ...recordsArray]);
      }
      
      // Use pagination info if available, otherwise check array length
      setHasMore(pagination ? pagination.hasMore : recordsArray.length === 20);
      
      // Extract unique forums from data
      if (recordsArray.length > 0) {
        const uniqueForums = [...new Set(recordsArray.map(item => item.forum_name).filter(Boolean))];
        setForums(prev => [...new Set([...prev, ...uniqueForums])]);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch records';
      const errorDetails = err.response?.data?.details || '';
      setError(`${errorMessage}${errorDetails ? ': ' + errorDetails : ''}`);
      console.error('Fetch error:', err);
      
      // Don't clear existing records on error if we're paginating
      if (page === 1) {
        setRecords([]);
      }
      setHasMore(false);
    } finally {
      setIsLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderPost = (post: Post) => (
    <Card key={`post-${post.id}`} className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{post.title}</CardTitle>
            <CardDescription>
              By {post.author} in {post.forum_name} • {formatDate(post.created_at)}
            </CardDescription>
          </div>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Topic #{post.topic_id}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-3 line-clamp-3">{post.content}</p>
        
        {post.post_evaluation && (
          <div className="border-t pt-3 mt-3">
            <h4 className="text-sm font-semibold mb-2">AI Evaluation</h4>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <div>
                <span className="text-xs text-gray-500">Quality</span>
                <p className="text-sm font-medium">{post.post_evaluation.quality_score.toFixed(1)}/10</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Relevance</span>
                <p className="text-sm font-medium">{post.post_evaluation.relevance_score.toFixed(1)}/10</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Sentiment</span>
                <p className="text-sm font-medium capitalize">{post.post_evaluation.sentiment}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 italic">{post.post_evaluation.summary}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderTopic = (topic: Topic) => (
    <Card key={`topic-${topic.id}`} className="mb-4">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg">{topic.title}</CardTitle>
            <CardDescription>
              {topic.forum_name} • {formatDate(topic.created_at)}
            </CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{topic.posts_count} posts</p>
            <p className="text-xs text-gray-500">{topic.views} views</p>
          </div>
        </div>
      </CardHeader>
      {topic.topic_evaluation && (
        <CardContent>
          <div className="border-t pt-3">
            <h4 className="text-sm font-semibold mb-2">AI Evaluation</h4>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <span className="text-xs text-gray-500">Quality</span>
                <p className="text-sm font-medium">{topic.topic_evaluation.quality_score.toFixed(1)}/10</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Relevance</span>
                <p className="text-sm font-medium">{topic.topic_evaluation.relevance_score.toFixed(1)}/10</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 italic">{topic.topic_evaluation.summary}</p>
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <Layout>
      <div className="container mx-auto py-10">
        <h1 className="text-4xl font-bold mb-8">Explore Indexed Records</h1>

        {/* Connection Status Banner */}
        {isConnected === false && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>Backend server is not connected. Please ensure the server is running on port 3004.</span>
            </div>
          </div>
        )}

        {/* Filters and Tabs */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              <Button
                variant={activeTab === 'posts' ? 'default' : 'outline'}
                onClick={() => setActiveTab('posts')}
              >
                Posts
              </Button>
              <Button
                variant={activeTab === 'topics' ? 'default' : 'outline'}
                onClick={() => setActiveTab('topics')}
              >
                Topics
              </Button>
            </div>

            <select
              value={selectedForum}
              onChange={(e) => setSelectedForum(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Forums</option>
              {forums.map(forum => (
                <option key={forum} value={forum}>{forum}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <Button 
                onClick={() => fetchRecords()}
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Records List */}
        <div>
          {records.length === 0 && !isLoading && !error ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="space-y-3">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">No {activeTab} found</h3>
                  <p className="text-gray-500">
                    {selectedForum !== 'all' 
                      ? `There are no ${activeTab} in ${selectedForum} yet.`
                      : `No ${activeTab} have been indexed yet. Start crawling to populate data.`
                    }
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {activeTab === 'posts' 
                ? (records as Post[]).map(renderPost)
                : (records as Topic[]).map(renderTopic)
              }
            </>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-2 text-gray-500">Loading records...</p>
            </div>
          )}

          {/* Load More */}
          {!isLoading && hasMore && records.length > 0 && (
            <div className="text-center py-6">
              <Button
                onClick={() => setPage(prev => prev + 1)}
                variant="outline"
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}