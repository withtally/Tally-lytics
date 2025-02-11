import { zodResponseFormat } from 'openai/helpers/zod';
import { ProposalEvaluationSchema } from './schema';
import { SnapshotProposal } from '../snapshot/index';
import { insertSnapshotProposalEvaluation } from '../../db/models/snapshotProposalEvaluations';
import { openai, model } from './openaiClient';
// import { processContent, evaluateContent } from "./contentProcessorService";
import { Logger } from '../logging';
import { loggerConfig } from '../../config/loggerConfig';
import { sanitizeContent } from './contentProcessorService';
import { withLLMErrorHandling } from '../errorHandling/llmErrors';
import { vectorizeContent } from './embeddings/hybridVectorizer';

const _logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/snapshot-evaluation-service.log',
});

export async function evaluateSnapshotProposal(proposal: SnapshotProposal, forumName: string) {
  try {
    // Parse proposal.choices if it's a string
    let choicesArray: string[];
    if (typeof proposal.choices === 'string') {
      choicesArray = JSON.parse(proposal.choices);
    } else {
      choicesArray = proposal.choices;
    }

    const completion = await withLLMErrorHandling(async () => {
      return openai.beta.chat.completions.parse({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert in evaluating governance proposals. Analyze the given proposal and provide insights in the specified JSON format.',
          },
          {
            role: 'user',
            content: `Evaluate the following Snapshot proposal:
Title: ${sanitizeContent(proposal.title)}
Body: ${sanitizeContent(proposal.body)}
Choices: ${choicesArray.join(', ')}
Current State: ${proposal.state}
Total Votes: ${proposal.scores_total}

Please provide a JSON object with the following keys:
- summary: A brief summary of the proposal.
- impact: Potential impact on the project/community.
- pros_and_cons: Pros and cons of the proposal.
- risks_and_concerns: Any potential risks or concerns.
- overall_assessment: Overall assessment (positive, neutral, or negative).`,
          },
        ],
        response_format: zodResponseFormat(ProposalEvaluationSchema, 'proposal_evaluation'),
      });
    }, 'Error in evaluating Snapshot Proposal');

    if (completion === null) {
      throw new Error('Evaluate Snpashot Proposal skipped due to insufficient LLM credits');
    }

    const evaluationData = completion.choices[0].message.parsed;

    const evaluation = {
      proposal_id: proposal.id,
      forum_name: forumName, // Make sure this is included
      summary: evaluationData?.summary || '',
      impact: evaluationData?.impact || '',
      pros_and_cons: evaluationData?.pros_and_cons || '',
      risks_and_concerns: evaluationData?.risks_and_concerns || '',
      overall_assessment: evaluationData?.overall_assessment || '',
    };

    await insertSnapshotProposalEvaluation(evaluation);

    // Make sure vectorization includes forum_name
    await vectorizeContent('snapshot_proposals', proposal.id, forumName);

    return evaluation;
  } catch (error: any) {
    console.error('Error in evaluating Snapshot proposal:', error);
    throw error;
  }
}
