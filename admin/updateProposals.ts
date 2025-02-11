// File: /Users/dennisonbertram/develop/discourse-demo/updateProposals.ts

import { forumConfigs } from './config/forumConfig';
import { startTallyProposalUpdater } from './services/tallyCrawler';

export async function updateProposals(
  startTallyUpdater = startTallyProposalUpdater
): Promise<void> {
  for (const config of forumConfigs) {
    console.log(`Starting proposal update for ${config.name}`);

    if (config.tallyConfig) {
      await startTallyUpdater(
        config.tallyConfig.apiKey,
        config.tallyConfig.organizationId,
        config.name
      );
    }

    console.log(`Completed proposal update for ${config.name}`);
  }

  console.log('All proposal updates completed');
}

updateProposals().catch(console.error);
