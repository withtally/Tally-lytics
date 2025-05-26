// services/snapshot/snapshotUtils.ts

export interface SnapshotProposal {
  id: string;
  forum_name: string;
  title: string;
  body: string;
  choices: string[];
  start: number;
  end: number;
  snapshot: string;
  state: string;
  author: string;
  space: {
    id: string;
    name: string;
  };
  scores: number[];
  scores_total: number;
}

export interface DatabaseProposal {
  id: string;
  title: string;
  body: string;
  choices: string;
  start: Date;
  end: Date;
  snapshot: string;
  state: string;
  author: string;
  space_id: string;
  space_name: string;
  scores: string;
  scores_total: string;
  forum_name: string;
}

export interface CrawlInfo {
  lastTimestamp: Date;
}

export interface BatchProcessingConfig {
  batchSize: number;
  processDelay: number;
}

/**
 * Converts Unix timestamp to Date object
 */
export function timestampToDate(timestamp: number): Date {
  return new Date(timestamp * 1000);
}

/**
 * Finds the newest timestamp from a batch of proposals
 */
export function getNewestTimestamp(proposals: SnapshotProposal[], currentNewest: number): number {
  return proposals.reduce((newest, proposal) => Math.max(newest, proposal.start), currentNewest);
}

/**
 * Filters proposals that are newer than the last crawl timestamp
 */
export function filterNewProposals(
  proposals: SnapshotProposal[],
  lastCrawlTimestamp: Date
): SnapshotProposal[] {
  const lastCrawlMs = lastCrawlTimestamp.getTime();
  return proposals.filter(proposal => proposal.start * 1000 > lastCrawlMs);
}

/**
 * Transforms a snapshot proposal into database format
 */
export function transformProposalForDatabase(
  proposal: SnapshotProposal,
  forumName: string
): DatabaseProposal {
  return {
    id: proposal.id,
    title: proposal.title,
    body: proposal.body,
    choices: JSON.stringify(proposal.choices),
    start: timestampToDate(proposal.start),
    end: timestampToDate(proposal.end),
    snapshot: proposal.snapshot,
    state: proposal.state,
    author: proposal.author,
    space_id: proposal.space.id,
    space_name: proposal.space.name,
    scores: JSON.stringify(proposal.scores),
    scores_total: proposal.scores_total?.toString() || '0',
    forum_name: forumName,
  };
}

/**
 * Transforms a batch of proposals for database insertion
 */
export function transformProposalsBatch(
  proposals: SnapshotProposal[],
  forumName: string
): DatabaseProposal[] {
  return proposals.map(proposal => transformProposalForDatabase(proposal, forumName));
}

/**
 * Splits an array into batches of specified size
 */
export function createBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Calculates pagination parameters for GraphQL queries
 */
export function calculatePaginationParams(
  currentSkip: number,
  batchSize: number,
  _totalProcessed: number
): {
  skip: number;
  first: number;
  hasMore: boolean;
} {
  return {
    skip: currentSkip,
    first: batchSize,
    hasMore: true, // This will be determined by response length
  };
}

/**
 * Determines if there are more items to fetch based on batch size
 */
export function shouldContinuePagination(
  batchLength: number,
  expectedBatchSize: number,
  hasNewItems: boolean
): boolean {
  // Continue if we got a full batch and found new items
  return batchLength >= expectedBatchSize && hasNewItems;
}

/**
 * Validates that a proposal has required fields
 */
export function validateProposal(proposal: any): proposal is SnapshotProposal {
  return (
    typeof proposal.id === 'string' &&
    typeof proposal.title === 'string' &&
    typeof proposal.body === 'string' &&
    Array.isArray(proposal.choices) &&
    typeof proposal.start === 'number' &&
    typeof proposal.end === 'number' &&
    typeof proposal.state === 'string' &&
    typeof proposal.author === 'string' &&
    proposal.space &&
    typeof proposal.space.id === 'string' &&
    typeof proposal.space.name === 'string'
  );
}

/**
 * Validates and filters a batch of proposals
 */
export function validateAndFilterProposals(proposals: any[]): SnapshotProposal[] {
  return proposals.filter(validateProposal);
}

/**
 * Creates GraphQL variables for fetching proposals
 */
export function createGraphQLVariables(
  spaceId: string,
  first: number,
  skip: number
): {
  spaceId: string;
  first: number;
  skip: number;
} {
  return {
    spaceId,
    first,
    skip,
  };
}

/**
 * Determines if crawling should stop based on timestamp comparison
 */
export function shouldStopCrawling(newestTimestamp: number, lastCrawlTimestamp: Date): boolean {
  return newestTimestamp <= lastCrawlTimestamp.getTime();
}

/**
 * Calculates delay between batch processing based on attempt number
 */
export function calculateRetryDelay(attempt: number, baseDelay: number = 1000): number {
  return Math.pow(2, attempt) * baseDelay;
}

/**
 * Creates a default crawl info object for new spaces
 */
export function createDefaultCrawlInfo(): CrawlInfo {
  return {
    lastTimestamp: new Date(0), // Unix epoch
  };
}

/**
 * Formats proposal data for logging
 */
export function formatProposalForLog(proposal: SnapshotProposal): string {
  return `${proposal.id} - "${proposal.title}" (${proposal.state})`;
}

/**
 * Calculates crawling statistics
 */
export function calculateCrawlingStats(
  totalFetched: number,
  newProposals: number,
  startTime: Date
): {
  totalFetched: number;
  newProposals: number;
  duration: number;
  rate: number;
} {
  const duration = Date.now() - startTime.getTime();
  return {
    totalFetched,
    newProposals,
    duration,
    rate: totalFetched / (duration / 1000), // items per second
  };
}

/**
 * Checks if a timestamp is valid (not in the future, not too old)
 */
export function isValidTimestamp(timestamp: number): boolean {
  const now = Date.now() / 1000;
  const minValidTimestamp = new Date('2020-01-01').getTime() / 1000; // Snapshot launched in 2020

  return timestamp > minValidTimestamp && timestamp <= now;
}

/**
 * Sanitizes proposal text content
 */
export function sanitizeProposalContent(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove excessive whitespace and normalize line breaks
  return content
    .trim()
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, 50000); // Reasonable length limit
}

/**
 * Sanitizes and validates a proposal object
 */
export function sanitizeProposal(proposal: SnapshotProposal): SnapshotProposal {
  return {
    ...proposal,
    title: sanitizeProposalContent(proposal.title),
    body: sanitizeProposalContent(proposal.body),
    choices: proposal.choices.map(choice => sanitizeProposalContent(choice)),
    start: Math.floor(proposal.start), // Ensure integer
    end: Math.floor(proposal.end),
    scores_total: Math.max(0, proposal.scores_total || 0), // Ensure non-negative
  };
}
