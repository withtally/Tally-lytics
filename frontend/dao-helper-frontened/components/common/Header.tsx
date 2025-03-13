import React from 'react';
import Link from 'next/link';
import { cn } from '../../utils/cn';

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header className={cn("border-b bg-background sticky top-0 z-40", className)}>
      <div className="container flex h-16 items-center px-4 sm:px-6">
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-2xl">Tally-lytics</span>
          </Link>
        </div>
        <div className="flex flex-1 justify-end space-x-4">
          <nav className="flex items-center space-x-4">
            <Link 
              href="/dashboard" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            <Link 
              href="/data-collection" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Data Collection
            </Link>
            <Link 
              href="/search" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Search & Analysis
            </Link>
            <Link 
              href="/system" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              System
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
