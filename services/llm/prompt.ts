const evaluationCriteria = `
For each dimension, use the following definitions to ensure a consistent and detailed evaluation:

- **overall_quality**: General assessment of the post's quality, summarizing how informative, balanced, and well-constructed it is.
- **helpfulness**: Measure of how useful or supportive the post is to the forum's objectives or to other participants.
- **relevance**: Degree to which the post aligns with the topic and contributes meaningfully to the discussion.
- **unique_perspective**: Assessment of whether the post introduces fresh insights, ideas, or points of view.
- **logical_reasoning**: Evaluation of the coherence and logical structure of the arguments presented.
- **fact_based**: Degree to which the post relies on factual information, supported by data or credible sources.
- **clarity**: Measure of the post’s readability, including language clarity and conciseness.
- **constructiveness**: The extent to which the post contributes positively to the discussion, offering solutions or constructive feedback.
- **hostility**: Measure of any negative tone, aggressiveness, or inflammatory language within the post (lower scores are more desirable).
- **emotional_tone**: General emotional undertone, whether positive, neutral, or negative.
- **engagement_potential**: Likelihood that the post will encourage responses, promote further discussion, or engage the community.
- **persuasiveness**: Effectiveness in persuading or convincing others of the viewpoint presented.
- **dominant_topic**: Main topic or theme of the post, capturing the primary subject or idea.
- **key_points**: List of the main arguments, points, or claims presented within the post.
- **suggested_improvements**: Any suggestions that could improve the quality, relevance, or tone of the post.
- **tags**: List of relevant tags that could be assigned to the post based on its content.

Use a scoring range of 1 to 10, where higher scores represent better quality or more desirable attributes, except for "hostility," where lower scores are preferred. If there is no text, or no content, return 0 for all numerical parameters and 'No content provided' for all text fields. Analyze the following forum post based on these criteria:
`;

export const systemPostPrompt = `You are an expert in evaluating discourse forum posts. 
Please analyze the given post across multiple dimensions and return a structured JSON object as per the provided schema. ${evaluationCriteria}`;

export const systemTopicEvaluationChunkPrompt = `You are an expert in evaluating discourse forum topics. 
Please analyze the given topic chunk across multiple dimensions and return a structured JSON object as per the provided schema. ${evaluationCriteria}`;

export const systemTopicSummaryPrompt = `You are an assistant who provides concise summaries of discussion topics and relevant tags.`;
