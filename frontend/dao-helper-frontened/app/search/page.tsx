'use client';

import React, { useState } from 'react';
import { Button } from '../../components/common/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/common/Card';
import { Layout } from '../../components/common/Layout';

export default function UniversalSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  // Mock search results
  const mockResults = [
    {
      id: 1,
      type: 'forum',
      title: 'Proposal: Uniswap v4 Migration Strategy',
      source: 'Uniswap Forums',
      date: '2025-03-10 14:22:05',
      excerpt: 'This proposal outlines the migration strategy for v4, including key changes to the protocol architecture and security considerations...',
      url: 'https://gov.uniswap.org/t/proposal-uniswap-v4-migration',
      relevance: 0.92
    },
    {
      id: 2,
      type: 'news',
      title: 'Uniswap v4 Receives Widespread Community Support',
      source: 'CoinDesk',
      date: '2025-03-12 09:45:18',
      excerpt: 'The upcoming Uniswap v4 upgrade has received overwhelming support from the community, with over 95% of UNI token holders voting in favor...',
      url: 'https://www.coindesk.com/uniswap-v4-community-support',
      relevance: 0.89
    },
    {
      id: 3,
      type: 'forum',
      title: 'Technical Discussion: Uniswap v4 Fee Structure',
      source: 'Uniswap Forums',
      date: '2025-03-08 11:34:52',
      excerpt: 'Detailed analysis of the proposed fee structure for v4 and its potential impact on liquidity providers and traders...',
      url: 'https://gov.uniswap.org/t/technical-discussion-v4-fee-structure',
      relevance: 0.85
    },
    {
      id: 4,
      type: 'news',
      title: 'Uniswap Leads DEX Innovation with v4 Release',
      source: 'The Block',
      date: '2025-03-11 16:08:33',
      excerpt: 'With the upcoming v4 release, Uniswap continues to lead innovation in the DEX space, introducing features that address key challenges...',
      url: 'https://www.theblock.co/uniswap-v4-innovation',
      relevance: 0.78
    },
    {
      id: 5,
      type: 'market',
      title: 'UNI Token Price Analysis',
      source: 'Market Data',
      date: '2025-03-13 08:30:00',
      excerpt: 'UNI token has seen a 15% increase following the v4 announcement, with trading volume reaching a 3-month high...',
      url: 'https://market-data/uni-price-analysis',
      relevance: 0.72
    },
  ];

  // Filter types
  const filterTypes = [
    { id: 'all', label: 'All Sources' },
    { id: 'forum', label: 'Forum Posts' },
    { id: 'news', label: 'News Articles' },
    { id: 'market', label: 'Market Data' },
  ];

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate API call with a timeout
    setTimeout(() => {
      setSearchResults(mockResults);
      setIsSearching(false);
    }, 800);
  };

  // Filter results based on active filter
  const filteredResults = activeFilter === 'all' 
    ? searchResults 
    : searchResults.filter(result => result.type === activeFilter);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Universal Search</h1>
          <p className="text-muted-foreground">
            Search across all DAO data sources including forums, news, and market data
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search for DAO information..."
                  className="w-full px-4 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              {filterTypes.map((filter) => (
                <Button
                  key={filter.id}
                  variant={activeFilter === filter.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveFilter(filter.id)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Results for "{searchQuery}"
              </h2>
              <span className="text-sm text-muted-foreground">
                {filteredResults.length} results found
              </span>
            </div>

            <div className="space-y-4">
              {filteredResults.map((result) => (
                <Card key={result.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mb-2 ${
                          result.type === 'forum' 
                            ? 'bg-blue-100 text-blue-800' 
                            : result.type === 'news' 
                              ? 'bg-green-100 text-green-800'
                              : 'bg-purple-100 text-purple-800'
                        }`}>
                          {result.type === 'forum' ? 'Forum Post' : result.type === 'news' ? 'News Article' : 'Market Data'}
                        </span>
                        <h3 className="text-lg font-medium mb-1">{result.title}</h3>
                        <div className="text-sm text-muted-foreground mb-2">
                          {result.source} • {result.date}
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

            <div className="mt-6 flex justify-center">
              <Button variant="outline">Load More Results</Button>
            </div>
          </div>
        )}

        {/* Search Tips */}
        {searchResults.length === 0 && !isSearching && (
          <Card>
            <CardHeader>
              <CardTitle>Search Tips</CardTitle>
              <CardDescription>Get the most out of the universal search</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm list-disc pl-5">
                <li>Use <span className="font-mono">dao:name</span> to filter results for a specific DAO (e.g., <span className="font-mono">dao:uniswap</span>)</li>
                <li>Use <span className="font-mono">type:forum</span>, <span className="font-mono">type:news</span>, or <span className="font-mono">type:market</span> to filter by content type</li>
                <li>Use <span className="font-mono">date:YYYY-MM-DD</span> to find content from a specific date</li>
                <li>Enclose phrases in quotes for exact matches (e.g., <span className="font-mono">"governance proposal"</span>)</li>
                <li>Use <span className="font-mono">-keyword</span> to exclude results containing specific terms</li>
              </ul>
            </CardContent>
            <CardFooter>
              <div className="text-sm text-muted-foreground">
                Try searching for topics like "governance", "treasury", or specific DAOs like "Uniswap" or "Aave".
              </div>
            </CardFooter>
          </Card>
        )}
      </div>
    </Layout>
  );
}
