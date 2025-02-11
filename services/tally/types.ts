// File: /Users/dennisonbertram/develop/discourse-demo/services/tally/types.ts

import { z } from 'zod';

const VoteStatSchema = z.object({
  votesCount: z.number(),
  percent: z.number(),
  type: z.string(),
  votersCount: z.number(),
});

export const ProposalSchema = z.object({
  id: z.string(),
  forum_name: z.string(), // Add this field
  onchain_id: z.string(), // Change from onchainId
  original_id: z.string().nullable(), // Change from originalId
  status: z.string(),
  created_at: z.string(), // Change from createdAt
  description: z.string(),
  title: z.string(),
  start_timestamp: z.string().nullable(), // Change from startTimestamp
  governor_id: z.string(), // Change from governorId
  governor_name: z.string(), // Change from governorName
  quorum: z.string().nullable(),
  timelock_id: z.string().nullable(), // Change from timelockId
  token_decimals: z.number().nullable(), // Change from tokenDecimals
  vote_stats: z.array(VoteStatSchema), // Change from voteStats
});

// export type Proposal = z.infer<typeof ProposalSchema>;

export interface Proposal {
  id: string;
  forum_name: string;
  onchain_id: string;
  original_id: string;
  status: string;
  created_at: string;
  description: string;
  title: string;
  start_timestamp?: string;
  governor_id: string;
  governor_name: string;
  quorum: number;
  timelock_id: string;
  token_decimals: number;
  vote_stats: Array<{
    votesCount: number;
    percent: number;
    type: string;
    votersCount: number;
  }>;
}

export interface ApiConfig {
  apiKey: string;
  apiUrl: string;
}

export interface DbConfig {
  client: string;
  connection: {
    host?: string;
    port?: string | number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean;
  };
  migrations?: {
    directory: string;
  };
  pool?: {
    min: number;
    max: number;
  };
}

export interface LogConfig {
  level: string;
}

export interface CrawlerConfig {
  apiConfig: ApiConfig;
  dbConfig: DbConfig;
  logConfig: LogConfig;
  organizationId: string;
}

export interface ProposalQueryResult {
  proposals: {
    nodes: Proposal[];
    pageInfo: {
      firstCursor: string | null;
      lastCursor: string | null;
      count: number;
    };
  };
}

export interface TallyProposal {
  id: string;
  forum_name: string; // Add this field
  onchain_id: string; // Change from onchainId
  original_id: string | null; // Change from originalId
  status: string;
  created_at: string; // Change from createdAt
  description: string;
  title: string;
  start_timestamp: string; // Change from startTimestamp
  governor_id: string; // Change from governorId
  governor_name: string; // Change from governorName
  quorum: string | null;
  timelock_id: string | null; // Change from timelockId
  token_decimals: number | null; // Change from tokenDecimals
  vote_stats: any; // Change from voteStats
}
