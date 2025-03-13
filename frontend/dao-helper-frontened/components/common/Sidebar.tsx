import React from 'react';
import Link from 'next/link';
import { cn } from '../../utils/cn';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const navItems = [
    {
      section: 'Dashboard',
      items: [
        { name: 'Overview', href: '/dashboard' },
        { name: 'Analytics', href: '/dashboard/analytics' },
      ]
    },
    {
      section: 'Data Collection',
      items: [
        { name: 'Forum Crawlers', href: '/data-collection/forums' },
        { name: 'Market Data', href: '/data-collection/market' },
        { name: 'News', href: '/data-collection/news' },
      ]
    },
    {
      section: 'Search & Analysis',
      items: [
        { name: 'Universal Search', href: '/search' },
        { name: 'Common Topics', href: '/search/topics' },
        { name: 'AI Assistant', href: '/search/assistant' },
      ]
    },
    {
      section: 'System Management',
      items: [
        { name: 'Health Monitor', href: '/system/health' },
        { name: 'Cron Jobs', href: '/system/cron' },
        { name: 'Logs', href: '/system/logs' },
      ]
    },
  ];

  return (
    <aside className={cn("pb-12 w-64 border-r bg-background", className)}>
      <div className="space-y-4 py-4">
        {navItems.map((section) => (
          <div key={section.section} className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              {section.section}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
