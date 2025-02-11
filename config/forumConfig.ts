// forumConfig.ts

export interface ForumConfig {
  name: string;
  apiConfig: {
    apiKey: string;
    apiUsername: string;
    discourseUrl: string;
  };
  snapshotSpaceId?: string;
  tallyConfig?: {
    apiKey: string;
    organizationId: string;
  };
  tokenConfig?: {
    address: string;
    network: string;
    coingeckoPlatform: string;
    coingeckoId?: string;
  };
}

export const forumConfigs: ForumConfig[] = [
  {
    name: 'COMPOUND',
    apiConfig: {
      apiKey: process.env.COMPOUND_API_KEY || '',
      apiUsername: process.env.COMPOUND_API_USERNAME || '',
      discourseUrl: process.env.COMPOUND_DISCOURSE_URL || '',
    },
    tokenConfig: {
      address: '0xc00e94cb662c3520282e6f5717214004a7f26888',
      network: 'eip155:1',
      coingeckoPlatform: 'ethereum',
      coingeckoId: 'compound-governance-token',
    },
  },
  {
    name: 'ZKSYNC',
    apiConfig: {
      apiKey: process.env.ZKSYNC_API_KEY || '',
      apiUsername: process.env.ZKSYNC_API_USERNAME || '',
      discourseUrl: process.env.ZKSYNC_DISCOURSE_URL || '',
    },
    tokenConfig: {
      address: '0x5a7d6b2f92c77fad6ccabd7ee0624e64907eaf3e',
      network: 'eip155:324',
      coingeckoPlatform: 'zksync',
      coingeckoId: 'zksync',
    },
  },
  {
    name: 'GITCOIN',
    apiConfig: {
      apiKey: process.env.GITCOIN_API_KEY || '',
      apiUsername: process.env.GITCOIN_API_USERNAME || '',
      discourseUrl: process.env.GITCOIN_DISCOURSE_URL || '',
    },
    tokenConfig: {
      address: '0xde30da39c46104798bb5aa3fe8b9e0e1f348163f',
      network: 'eip155:1',
      coingeckoPlatform: 'ethereum',
      coingeckoId: 'gitcoin',
    },
  },
  {
    name: 'CABIN',
    apiConfig: {
      apiKey: process.env.CABIN_API_KEY || '',
      apiUsername: process.env.CABIN_API_USERNAME || '',
      discourseUrl: process.env.CABIN_DISCOURSE_URL || '',
    },
  },
  {
    name: 'SAFE',
    apiConfig: {
      apiKey: process.env.SAFE_API_KEY || '',
      apiUsername: process.env.SAFE_API_USERNAME || '',
      discourseUrl: process.env.SAFE_DISCOURSE_URL || '',
    },
    snapshotSpaceId: 'safe.eth',
  },
  {
    name: 'UNISWAP',
    apiConfig: {
      apiKey: process.env.UNISWAP_API_KEY || '',
      apiUsername: process.env.UNISWAP_API_USERNAME || '',
      discourseUrl: process.env.UNISWAP_DISCOURSE_URL || '',
    },
    snapshotSpaceId: 'uniswapgovernance.eth',
    tallyConfig: {
      apiKey: process.env.TALLY_API || '',
      organizationId: '2206072050458560434',
    },
    tokenConfig: {
      address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
      network: 'eip155:1',
      coingeckoPlatform: 'ethereum',
      coingeckoId: 'uniswap',
    },
  },
  {
    name: 'ARBITRUM',
    apiConfig: {
      apiKey: process.env.ARBITRUM_API_KEY || '',
      apiUsername: process.env.ARBITRUM_API_USERNAME || '',
      discourseUrl: process.env.ARBITRUM_DISCOURSE_URL || '',
    },
    snapshotSpaceId: 'arbitrumfoundation.eth',
    tallyConfig: {
      apiKey: process.env.TALLY_API || '',
      organizationId: '2206072050315953936',
    },
    tokenConfig: {
      address: '0x912ce59144191c1204e64559fe8253a0e49e6548',
      network: 'eip155:42161',
      coingeckoPlatform: 'arbitrum-one',
      coingeckoId: 'arbitrum',
    },
  },
];
