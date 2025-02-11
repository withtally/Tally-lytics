import { forumConfigs } from './forumConfig';
export * from './forumConfig';
export * from './loggerConfig';

// Get the Uniswap config from forumConfigs
const uniswapConfig = forumConfigs.find(config => config.name === 'UNISWAP');

if (!uniswapConfig) {
  throw new Error('Uniswap forum configuration not found');
}

// Default export combining all configs
export const config = {
  forums: {
    uniswap: uniswapConfig,
  },
};

export default config;
