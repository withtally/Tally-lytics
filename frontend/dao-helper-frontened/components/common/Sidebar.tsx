import React from 'react';
import Link from 'next/link';
import { cn } from '../../utils/cn';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const navItems = [
    {
      section: 'Main',
      items: [
        { name: 'Dashboard', href: '/' },
        { name: 'Explore Records', href: '/explore' },
      ],
    },
    {
      section: 'Indexing',
      items: [
        { name: 'Forum Crawlers', href: '/crawlers' },
        { name: 'Common Topics', href: '/topics' },
      ],
    },
    {
      section: 'Search & Analysis',
      items: [{ name: 'Universal Search', href: '/search' }],
    },
    {
      section: 'System',
      items: [
        { name: 'Health Status', href: '/system' },
        { name: 'Cron Management', href: '/system/cron-management' },
        { name: 'Job History', href: '/system/jobs' },
      ],
    },
  ];

  return (
    <aside className={cn('pb-12 w-64 border-r bg-background', className)}>
      <div className="space-y-4 py-4">
        {navItems.map(section => (
          <div key={section.section} className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">{section.section}</h2>
            <div className="space-y-1">
              {section.items.map(item => (
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
