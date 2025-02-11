import { GraphQLClient } from 'graphql-request';
import { RateLimiter } from 'limiter';
import { ApiConfig, Proposal } from './types';
import { handleGlobalError } from '../../services/errorHandling/globalErrorHandler';

interface _ProposalNode {
  id: string;
  onchainId: string;
  originalId: string;
  status: string;
  createdAt: string;
  metadata: {
    title: string;
    description: string;
    eta?: string;
    ipfsHash?: string;
    previousEnd?: string;
    timelockId?: string;
    txHash?: string;
    discourseURL?: string;
    snapshotURL?: string;
  };
  start?: {
    timestamp: string;
  };
  block?: {
    timestamp: string;
  };
  governor: {
    id: string;
    quorum: number;
    name: string;
    timelockId: string;
    token: {
      decimals: number;
    };
  };
  voteStats: Array<{
    votesCount: number;
    percent: number;
    type: string;
    votersCount: number;
  }>;
}

// services/tally/apiService.ts
// Added retry logic, improved error handling

export class ApiService {
  private client: GraphQLClient;
  private rateLimiter: RateLimiter;

  constructor(private config: ApiConfig) {
    this.client = new GraphQLClient(this.config.apiUrl, {
      headers: {
        'Api-Key': this.config.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'DiscourseDemo/1.0',
      },
    });
    this.rateLimiter = new RateLimiter({ tokensPerInterval: 1, interval: 'second' });
  }

  private async safeRequest<T>(query: string, variables: any): Promise<T> {
    await this.rateLimiter.removeTokens(1);
    let attempt = 0;
    const maxRetries = 3;
    const shouldRetry = true;

    while (shouldRetry && attempt < maxRetries) {
      attempt++;
      try {
        // Note: graphql-request doesn't integrate with fetch easily for retry,
        // We manually retry here on network failures:
        return await this.client.request<T>(query, variables);
      } catch (error: any) {
        if (
          attempt < maxRetries &&
          (error?.response?.status === 429 || error?.response?.status >= 500)
        ) {
          await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 1000));
          continue;
        }
        handleGlobalError(error, 'Tally ApiService request');
        throw error;
      }
    }
    throw new Error('Max retries exceeded');
  }

  async fetchProposals(
    organizationId: string,
    afterCursor: string = '',
    _retries = 3
  ): Promise<{ proposals: Proposal[]; endCursor: string }> {
    const query = `
      query GovernanceProposals($input: ProposalsInput!) {
        proposals(input: $input) {
          nodes {
            ... on Proposal {
              id
              onchainId
              status
              originalId
              createdAt
              voteStats {
                votesCount
                percent
                type
                votersCount
              }
              metadata {
                title
                description
                eta
                ipfsHash
                previousEnd
                timelockId
                txHash
                discourseURL
                snapshotURL
              }
              start {
                ... on Block { timestamp }
                ... on BlocklessTimestamp { timestamp }
              }
              block { timestamp }
              governor {
                id
                quorum
                name
                timelockId
                token { decimals }
              }
            }
          }
          pageInfo {
            firstCursor
            lastCursor
            count
          }
        }
      }
    `;

    const variables = {
      input: {
        filters: { organizationId },
        page: {
          limit: 20,
          afterCursor: afterCursor !== '' ? afterCursor : undefined,
        },
        sort: {
          isDescending: true,
          sortBy: 'id',
        },
      },
    };

    try {
      const data: any = await this.safeRequest(query, variables);
      const proposals = data.proposals.nodes.map((node: any) => ({
        id: node.id,
        forum_name: '', // set later
        onchain_id: node.onchainId,
        original_id: node.originalId,
        status: node.status,
        created_at: node.createdAt,
        description: node.metadata.description,
        title: node.metadata.title,
        start_timestamp: node.start?.timestamp || node.block?.timestamp,
        governor_id: node.governor.id,
        governor_name: node.governor.name,
        quorum: node.governor.quorum,
        timelock_id: node.governor.timelockId,
        token_decimals: node.governor.token.decimals,
        vote_stats: node.voteStats,
      }));

      // Sort by created_at descending
      proposals.sort(
        (a: Proposal, b: Proposal) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      return { proposals, endCursor: data.proposals.pageInfo.lastCursor };
    } catch (error: any) {
      handleGlobalError(error, 'fetchProposals');
      // Return empty if there's an error
      return { proposals: [], endCursor: '' };
    }
  }
}
