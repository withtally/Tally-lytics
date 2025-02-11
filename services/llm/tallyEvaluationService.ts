import { zodResponseFormat } from 'openai/helpers/zod';
import { ProposalEvaluationSchema } from './schema';
import { TallyProposal } from '../tally/types';
import { insertTallyProposalEvaluation } from '../../db/models/tallyProposalEvaluations';
import { openai, model } from './openaiClient';
import { sanitizeContent } from './contentProcessorService';
import { withLLMErrorHandling } from '../errorHandling/llmErrors';
import { vectorizeContent } from './embeddings/hybridVectorizer';

export async function evaluateTallyProposal(proposal: TallyProposal) {
  try {
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
            content: `Evaluate the following Tally proposal:
Title: ${sanitizeContent(proposal.title)}
Description: ${sanitizeContent(proposal.description)}
Status: ${proposal.status}
Created At: ${proposal.created_at}

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
    }, 'Error in evaluate Tally Proposal');

    if (completion === null) {
      throw new Error('Evaluate Tally Proposal skipped due to insufficient LLM credits');
    }

    const evaluationData = completion.choices[0].message.parsed;

    const evaluation = {
      proposal_id: proposal.id,
      forum_name: proposal.forum_name, // Make sure this is included
      summary: evaluationData?.summary || '',
      impact: evaluationData?.impact || '',
      pros_and_cons: evaluationData?.pros_and_cons || '',
      risks_and_concerns: evaluationData?.risks_and_concerns || '',
      overall_assessment: evaluationData?.overall_assessment || '',
    };

    await insertTallyProposalEvaluation(evaluation);

    // Make sure vectorization includes forum_name
    await vectorizeContent('tally_proposals', proposal.id, proposal.forum_name);

    return evaluation;
  } catch (error: any) {
    console.error('Error in evaluating Tally proposal:', error);
    throw error;
  }
}
