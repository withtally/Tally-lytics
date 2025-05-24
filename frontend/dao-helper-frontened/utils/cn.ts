import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// This utility function combines multiple class names and merges tailwind classes properly
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
