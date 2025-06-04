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

  useEffect(() => {
    fetchRecords();
  }, [activeTab, page, selectedForum]);

  useEffect(() => {
    // Reset page when changing tabs or forum
    setPage(1);
    setRecords([]);
  }, [activeTab, selectedForum]);

  const fetchRecords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let data;
      
      // Try to fetch real data from API
      try {
        if (activeTab === 'posts') {
          const response = await postsApi.getPosts({
            page,
            limit: 20,
            forum: selectedForum === 'all' ? undefined : selectedForum
          });
          data = response.data || response;
        } else {
          const response = await topicsApi.getTopics({
            page,
            limit: 20,
            forum: selectedForum === 'all' ? undefined : selectedForum
          });
          data = response.data || response;
        }
      } catch (apiError) {
        console.log('API not available, using mock data');
        // Fallback to mock data if API is not available
        data = activeTab === 'posts' 
          ? generateMockPosts(page)
          : generateMockTopics(page);
      }

      // Handle the data whether it's from API or mock
      const recordsArray = Array.isArray(data) ? data : data.records || [];
      setRecords(prev => page === 1 ? recordsArray : [...prev, ...recordsArray]);
      setHasMore(recordsArray.length === 20);
      
      // Extract unique forums from data
      if (recordsArray.length > 0) {
        const uniqueForums = [...new Set(recordsArray.map(item => item.forum_name))];
        setForums(prev => [...new Set([...prev, ...uniqueForums])]);
      }
    } catch (err) {
      setError('Failed to fetch records');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockPosts = (page: number): Post[] => {
    // This is placeholder data - replace with actual API call
    return Array.from({ length: 20 }, (_, i) => ({
      id: (page - 1) * 20 + i + 1,
      title: `Post ${(page - 1) * 20 + i + 1}: Discussion about governance proposal`,
      content: 'This is a sample post content discussing various aspects of DAO governance...',
      author: `user${Math.floor(Math.random() * 100)}`,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      forum_name: ['ARBITRUM', 'OPTIMISM', 'POLYGON'][Math.floor(Math.random() * 3)],
      topic_id: Math.floor(Math.random() * 1000),
      post_evaluation: {
        quality_score: Math.random() * 10,
        relevance_score: Math.random() * 10,
        sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)],
        summary: 'AI-generated summary of the post content...'
      }
    }));
  };

  const generateMockTopics = (page: number): Topic[] => {
    // This is placeholder data - replace with actual API call
    return Array.from({ length: 20 }, (_, i) => ({
      id: (page - 1) * 20 + i + 1,
      title: `Topic ${(page - 1) * 20 + i + 1}: Governance Proposal Discussion`,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      forum_name: ['ARBITRUM', 'OPTIMISM', 'POLYGON'][Math.floor(Math.random() * 3)],
      posts_count: Math.floor(Math.random() * 100),
      views: Math.floor(Math.random() * 1000),
      topic_evaluation: {
        quality_score: Math.random() * 10,
        relevance_score: Math.random() * 10,
        summary: 'AI-generated summary of the topic discussion...'
      }
    }));
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
            {error}
          </div>
        )}

        {/* Records List */}
        <div>
          {records.length === 0 && !isLoading ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No records found</p>
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