'use client';

import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../components/common/Card';
import { Layout } from '../../components/common/Layout';
import { searchApi } from '../../services/api';

// Define types for our search results
interface SearchResult {
  id: string;
  type: string;
  title: string;
  source: string;
  date: string;
  excerpt: string;
  url: string;
  relevance: number;
  forum?: string;
  // Additional properties that might be in API response
  name?: string;
  created?: string;
  content?: string;
  description?: string;
  score?: number;
}

export default function UniversalSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedForum, setSelectedForum] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [searchThreshold, setSearchThreshold] = useState(0.5);
  const [resultLimit, setResultLimit] = useState(10);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Filter types
  const filterTypes = [
    { id: 'all', label: 'All Sources' },
    { id: 'topic', label: 'Topics' },
    { id: 'post', label: 'Forum Posts' },
    { id: 'snapshot', label: 'Snapshots' },
    { id: 'tally', label: 'Tallies' },
  ];

  // Forum options
  const forumOptions = [
    { id: 'all', label: 'All Forums' },
    { id: 'uniswap', label: 'Uniswap' },
    { id: 'aave', label: 'Aave' },
    { id: 'compound', label: 'Compound' },
    { id: 'makerdao', label: 'MakerDAO' },
  ];

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      let response;

      if (activeFilter === 'all') {
        // Use searchAll API
        response = await searchApi.searchAll(
          searchQuery,
          selectedForum !== 'all' ? selectedForum : 'all',
          resultLimit,
          searchThreshold
        );
      } else {
        // Use searchByType API
        response = await searchApi.searchByType(
          searchQuery,
          activeFilter,
          selectedForum !== 'all' ? selectedForum : 'all',
          resultLimit,
          searchThreshold
        );
      }

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.data && Array.isArray(response.data)) {
        // Transform API response to match our UI format
        const formattedResults: SearchResult[] = response.data.map(
          (item: SearchResult, index: number) => ({
            id: item.id || `result-${index}`,
            type: item.type || 'unknown',
            title: item.title || item.name || 'Untitled',
            source: item.forum || item.source || 'Unknown Source',
            date: item.date || item.created || new Date().toISOString(),
            excerpt:
              item.excerpt ||
              item.content?.substring(0, 150) + '...' ||
              item.description ||
              'No content available',
            url: item.url || '#',
            relevance: item.relevance || item.score || 0.7,
            forum: item.forum,
          })
        );

        setSearchResults(formattedResults);
      } else if (response.data) {
        // Single result or non-array response
        const item = response.data;
        setSearchResults([
          {
            id: item.id || 'result-single',
            type: item.type || 'unknown',
            title: item.title || item.name || 'Untitled',
            source: item.forum || item.source || 'Unknown Source',
            date: item.date || item.created || new Date().toISOString(),
            excerpt:
              item.excerpt ||
              item.content?.substring(0, 150) + '...' ||
              item.description ||
              'No content available',
            url: item.url || '#',
            relevance: item.relevance || item.score || 0.7,
            forum: item.forum,
          },
        ]);
      } else {
        // Empty response
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError(
        err instanceof Error ? err.message : 'An error occurred during search. Please try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // Filter results based on active filter
  const filteredResults =
    activeFilter === 'all'
      ? searchResults
      : searchResults.filter(result => result.type === activeFilter);

  // Handle filter change
  const handleFilterChange = (filterId: string) => {
    setActiveFilter(filterId);
    // If we already have search results, re-search with the new filter
    if (searchResults.length > 0 && searchQuery.trim()) {
      // Reset results and trigger a new search
      setSearchResults([]);
      setTimeout(() => {
        handleSearch();
      }, 0);
    }
  };

  // Format display date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Get type display name
  const getTypeDisplayName = (type: string) => {
    switch (type.toLowerCase()) {
      case 'topic':
        return 'Topic';
      case 'post':
        return 'Forum Post';
      case 'snapshot':
        return 'Snapshot';
      case 'tally':
        return 'Tally';
      default:
        return type.charAt(0).toUpperCase() + type.slice(1);
    }
  };

  // Get type color class
  const getTypeColorClass = (type: string) => {
    switch (type.toLowerCase()) {
      case 'topic':
        return 'bg-purple-100 text-purple-800';
      case 'post':
        return 'bg-blue-100 text-blue-800';
      case 'snapshot':
        return 'bg-green-100 text-green-800';
      case 'tally':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Universal Search</h1>
          <p className="text-muted-foreground">
            Search across all DAO data sources including forums, snapshots, and governance data
          </p>
        </div>

        {/* Search Input */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyPress={event => event.key === 'Enter' && handleSearch()}
                  placeholder="Search for DAO information..."
                  className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="flex justify-between items-center flex-wrap mt-4">
              <div className="flex flex-wrap gap-2">
                {filterTypes.map(filter => (
                  <Button
                    key={filter.id}
                    variant={activeFilter === filter.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleFilterChange(filter.id)}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="ml-auto mt-2 sm:mt-0"
              >
                {showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}
              </Button>
            </div>

            {showAdvanced && (
              <div className="mt-4 border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Forum</label>
                  <select
                    value={selectedForum}
                    onChange={e => setSelectedForum(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  >
                    {forumOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Result Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={resultLimit}
                    onChange={e => setResultLimit(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 border border-input rounded-md"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Relevance Threshold ({(searchThreshold * 100).toFixed(0)}%)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={searchThreshold}
                    onChange={e => setSearchThreshold(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center text-red-800">
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading state */}
        {isSearching && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <span className="ml-3">Searching...</span>
          </div>
        )}

        {/* Search Results */}
        {!isSearching && searchResults.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Results for &quot;{searchQuery}&quot;</h2>
              <span className="text-sm text-muted-foreground">
                {filteredResults.length} results found
              </span>
            </div>

            <div className="space-y-4">
              {filteredResults.map(result => (
                <Card key={result.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${getTypeColorClass(result.type)}`}
                        >
                          {getTypeDisplayName(result.type)}
                        </span>
                        {result.forum && (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium ml-2 mb-2 bg-gray-100 text-gray-800">
                            {result.forum}
                          </span>
                        )}
                        <h3 className="text-lg font-medium mb-1">{result.title}</h3>
                        <div className="text-sm text-muted-foreground mb-2">
                          {result.source} • {formatDate(result.date)}
                        </div>
                        <p className="text-sm mb-3">{result.excerpt}</p>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary text-sm hover:underline"
                        >
                          View source →
                        </a>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          Relevance: {(result.relevance * 100).toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {searchResults.length > 5 && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline">Load More Results</Button>
              </div>
            )}
          </div>
        )}

        {/* Search Tips */}
        {searchResults.length === 0 && !isSearching && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Search Tips</CardTitle>
              <CardDescription>Get the most out of the universal search</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm list-disc pl-5">
                <li>
                  Use <span className="font-mono">dao:name</span> to filter results for a specific
                  DAO (e.g., <span className="font-mono">dao:uniswap</span>)
                </li>
                <li>
                  Use <span className="font-mono">type:post</span>,{' '}
                  <span className="font-mono">type:snapshot</span>, or{' '}
                  <span className="font-mono">type:tally</span> to filter by content type
                </li>
                <li>
                  Use <span className="font-mono">date:YYYY-MM-DD</span> to find content from a
                  specific date
                </li>
                <li>
                  Enclose phrases in quotes for exact matches (e.g.,{' '}
                  <span className="font-mono">&quot;governance proposal&quot;</span>)
                </li>
                <li>
                  Use <span className="font-mono">-keyword</span> to exclude results containing
                  specific terms
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <div className="text-sm text-muted-foreground">
                Try searching for topics like &quot;governance&quot;, &quot;treasury&quot;, or
                specific DAOs like &quot;Uniswap&quot; or &quot;Aave&quot;.
              </div>
            </CardFooter>
          </Card>
        )}

        {/* No results found */}
        {!isSearching && searchResults.length === 0 && searchQuery && !error && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <h3 className="text-lg font-medium mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  No results found for &quot;{searchQuery}&quot;. Try adjusting your search terms or
                  filters.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
