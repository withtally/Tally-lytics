'use client';

export function Providers({ children }: { children: React.ReactNode }) {
  // We can add other providers here in the future (like React Query)
  return <>{children}</>;
}