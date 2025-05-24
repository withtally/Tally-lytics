'use client';

import React, { useState } from 'react';
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

export default function CommonTopicsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeCategory, setActiveCategory] = useState('all');

  // Mock data for common topics
  const commonTopics = [
    {
      id: 1,
      name: 'Governance Framework',
      category: 'governance',
      mentionCount: 1245,
      percentChange: 8,
      relatedDAOs: ['Uniswap', 'Aave', 'Compound', 'MakerDAO'],
      lastMention: '2025-03-13 14:22:05',
    },
    {
      id: 2,
      name: 'Treasury Management',
      category: 'treasury',
      mentionCount: 982,
      percentChange: 15,
      relatedDAOs: ['Uniswap', 'MakerDAO', 'dYdX'],
      lastMention: '2025-03-12 16:45:18',
    },
    {
      id: 3,
      name: 'Protocol Security',
      category: 'security',
      mentionCount: 876,
      percentChange: 32,
      relatedDAOs: ['Aave', 'Compound', 'MakerDAO'],
      lastMention: '2025-03-13 12:11:56',
    },
    {
      id: 4,
      name: 'Fee Structure',
      category: 'economics',
      mentionCount: 754,
      percentChange: -5,
      relatedDAOs: ['Uniswap', 'dYdX'],
      lastMention: '2025-03-11 09:28:42',
    },
    {
      id: 5,
      name: 'Staking Rewards',
      category: 'economics',
      mentionCount: 721,
      percentChange: 6,
      relatedDAOs: ['Aave', 'Compound'],
      lastMention: '2025-03-12 20:15:33',
    },
    {
      id: 6,
      name: 'Voter Participation',
      category: 'governance',
      mentionCount: 645,
      percentChange: -2,
      relatedDAOs: ['Uniswap', 'Compound', 'MakerDAO'],
      lastMention: '2025-03-13 11:34:27',
    },
    {
      id: 7,
      name: 'Protocol Upgrades',
      category: 'development',
      mentionCount: 612,
      percentChange: 18,
      relatedDAOs: ['Uniswap', 'Aave'],
      lastMention: '2025-03-13 17:05:32',
    },
    {
      id: 8,
      name: 'Risk Management',
      category: 'security',
      mentionCount: 598,
      percentChange: 11,
      relatedDAOs: ['MakerDAO', 'Aave', 'Compound'],
      lastMention: '2025-03-12 14:22:18',
    },
  ];

  // Time range options
  const timeRangeOptions = [
    { id: '7d', label: '7 Days' },
    { id: '30d', label: '30 Days' },
    { id: '90d', label: '90 Days' },
    { id: '1y', label: '1 Year' },
  ];

  // Category filters
  const categories = [
    { id: 'all', label: 'All Categories' },
    { id: 'governance', label: 'Governance' },
    { id: 'economics', label: 'Economics' },
    { id: 'security', label: 'Security' },
    { id: 'development', label: 'Development' },
    { id: 'treasury', label: 'Treasury' },
  ];

  // Filter topics based on selected category
  const filteredTopics =
    activeCategory === 'all'
      ? commonTopics
      : commonTopics.filter(topic => topic.category === activeCategory);

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Common Topics Analysis</h1>
          <p className="text-muted-foreground">
            Discover trending topics and discussions across DAO communities
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div>
                <div className="text-sm font-medium mb-2">Topic Categories</div>
                <div className="flex flex-wrap gap-2">
                  {categories.map(category => (
                    <Button
                      key={category.id}
                      variant={activeCategory === category.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setActiveCategory(category.id)}
                    >
                      {category.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Time Range</div>
                <div className="flex gap-2">
                  {timeRangeOptions.map(option => (
                    <Button
                      key={option.id}
                      variant={timeRange === option.id ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setTimeRange(option.id)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Topics Analysis */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {activeCategory === 'all'
                ? 'All Topics'
                : `${categories.find(c => c.id === activeCategory)?.label} Topics`}
            </h2>
            <span className="text-sm text-muted-foreground">
              Showing {filteredTopics.length} topics for the last{' '}
              {timeRangeOptions.find(t => t.id === timeRange)?.label.toLowerCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTopics.map(topic => (
              <Card key={topic.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <div>
                      <CardTitle>{topic.name}</CardTitle>
                      <CardDescription className="mt-1">
                        Category: {topic.category.charAt(0).toUpperCase() + topic.category.slice(1)}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{topic.mentionCount}</div>
                      <div
                        className={`text-sm ${topic.percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {topic.percentChange >= 0 ? '↑' : '↓'} {Math.abs(topic.percentChange)}%
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-2">
                    Last mentioned: {topic.lastMention}
                  </div>
                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Related DAOs:</div>
                    <div className="flex flex-wrap gap-2">
                      {topic.relatedDAOs.map(dao => (
                        <span
                          key={dao}
                          className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                        >
                          {dao}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    Explore Topic
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>

        {/* Topic Relationships */}
        <Card>
          <CardHeader>
            <CardTitle>Topic Relationships</CardTitle>
            <CardDescription>Visual map of how different topics are connected</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            <div className="text-muted-foreground">
              [Topic Relationship Graph Placeholder]
              <div className="mt-4 text-center text-sm">
                An interactive graph would display here showing relationships between topics
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Download Graph Data</Button>
            <Button>Customize Visualization</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
}
