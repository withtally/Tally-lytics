import db from '../../db/db';
import { Logger } from '../../services/logging';
import { loggerConfig } from '../../config/loggerConfig';
import { RateLimiter } from 'limiter';

// Import your LLM call and token counting functions
import { callLLMWithRetry } from '../../services/llm/callLLMWithRetry';
import { countTokens } from '../../services/llm/tokenCounter';

// Configuration constants
const MODEL = 'gpt-4';
const TOKEN_LIMIT = 8000; // Adjust based on model's max token limit
const MAX_SUMMARY_TOKENS = 1024; // For summarizing a large article

const logger = new Logger({
  ...loggerConfig,
  logFile: 'logs/news-article-evaluation-crawler.log',
});

const limiter = new RateLimiter({ tokensPerInterval: 1, interval: 1000 }); // Avoid rate-limits

// This is the refined prompt for evaluating news articles
// Keep it in the same file for convenience, or move to another file if you prefer
const newsArticleEvalPrompt = `
You are an expert news analyst. You will read a news article and provide a structured evaluation. 
Consider the following:

- The article might be about DAOs, crypto governance, protocols, proposals, or general ecosystem news.
- Identify the key factual points, the article's overall quality, relevance, trustworthiness.
- Identify relevant tags or categories (e.g., "governance", "regulation", "market trends", "ecosystem news", "social impact").
- Suggest ways the coverage or clarity could be improved.

Return the answer in the following JSON format, and only return valid JSON:

{
  "evaluation_summary": "<A concise summary of the article's overall quality, relevance, and trustworthiness>",
  "key_points": ["point1","point2","point3"],
  "tags": ["tag1","tag2","tag3"],
  "suggested_improvements": "<Suggestions on how the article could be improved>"
}
`;

async function getUnevaluatedArticles(limit = 50) {
  const rows = await db('news_articles')
    .select('news_articles.*')
    .leftJoin('news_article_evaluations', function () {
      this.on('news_articles.id', 'news_article_evaluations.news_article_id').andOn(
        'news_articles.forum_name',
        'news_article_evaluations.forum_name'
      );
    })
    .whereNull('news_article_evaluations.id')
    .limit(limit);

  return rows;
}

async function summarizeLongArticle(article: any): Promise<string> {
  const summaryPrompt = `
The following article content is very long. Please summarize it into a concise summary that captures all main points, without losing crucial details. Keep the summary within around ${MAX_SUMMARY_TOKENS} tokens.

Article Content:
${article.content || article.description || 'N/A'}
  `;

  const response = await callLLMWithRetry(MODEL, summaryPrompt, 3, 2000, { max_tokens: 1024 });
  return response.trim();
}

async function prepareArticleInput(article: any): Promise<string> {
  // Combine relevant fields
  const baseContent = `
Article Title: ${article.title}
Source: ${article.source_name} (${article.source_id})
Published At: ${article.published_at}
Author: ${article.author || 'Unknown'}
Description: ${article.description || 'N/A'}
Content: ${article.content || 'N/A'}
  `;

  // Check token usage to decide if we need summarization
  const tokenCount = await countTokens(baseContent, MODEL);
  const promptCount = await countTokens(newsArticleEvalPrompt, MODEL);
  const totalCount = tokenCount + promptCount;

  if (totalCount > TOKEN_LIMIT) {
    logger.info(`Article ID ${article.id} is too long (${totalCount} tokens). Summarizing...`);
    // Summarize the content first
    const summarizedContent = await summarizeLongArticle(article);

    const summarizedBase = `
Article Title: ${article.title}
Source: ${article.source_name} (${article.source_id})
Published At: ${article.published_at}
Author: ${article.author || 'Unknown'}
Summary of Content (Due to length):
${summarizedContent}
    `;
    // Recount tokens after summarization
    const newCount = await countTokens(summarizedBase + newsArticleEvalPrompt, MODEL);
    if (newCount > TOKEN_LIMIT) {
      // In a worst-case scenario, we may need even more aggressive summarization or truncation
      logger.warn(`Even summarized article ID ${article.id} is too long. Truncating further...`);
      // Just take first N chars if still too large
      const truncatedSummary = summarizedContent.slice(0, 3000);
      return `
Article Title: ${article.title}
Source: ${article.source_name} (${article.source_id})
Published At: ${article.published_at}
Author: ${article.author || 'Unknown'}
Truncated Summary:
${truncatedSummary}

${newsArticleEvalPrompt}
      `;
    } else {
      return `${summarizedBase}\n\n${newsArticleEvalPrompt}`;
    }
  } else {
    // Just return original plus prompt
    return `${baseContent}\n\n${newsArticleEvalPrompt}`;
  }
}

async function evaluateArticle(article: any) {
  await limiter.removeTokens(1);
  const input = await prepareArticleInput(article);
  const completion = await callLLMWithRetry(MODEL, input, 3, 2000);

  let evalData;
  try {
    // Extract the content from the completion response
    const response = completion.choices[0]?.message?.content;
    if (!response) {
      logger.warn(`Empty response from LLM for article ID ${article.id}`);
      return {
        llm_model: MODEL,
        evaluation_summary: null,
        key_points: [],
        tags: [],
        suggested_improvements: null,
        raw_response: null,
      };
    }

    evalData = JSON.parse(response);
  } catch (error) {
    logger.warn(
      `Failed to parse LLM response as JSON for article ID ${article.id}. Response: ${completion.choices[0]?.message?.content || 'No content'}`
    );
    evalData = {
      evaluation_summary: null,
      key_points: null,
      tags: null,
      suggested_improvements: null,
    };
  }

  // Ensure key_points and tags are arrays if not null
  const keyPointsArray = Array.isArray(evalData.key_points) ? evalData.key_points : [];
  const tagsArray = Array.isArray(evalData.tags) ? evalData.tags : [];

  return {
    llm_model: MODEL,
    evaluation_summary: evalData.evaluation_summary || null,
    key_points: keyPointsArray,
    tags: tagsArray,
    suggested_improvements: evalData.suggested_improvements || null,
    raw_response: completion.choices[0]?.message?.content || null,
  };
}

async function insertEvaluation(articleId: number, article: any, evaluation: any) {
  await db('news_article_evaluations')
    .insert({
      news_article_id: articleId,
      forum_name: article.forum_name,
      evaluation: evaluation.evaluation_summary || '',
      metadata: {
        key_points: evaluation.key_points,
        tags: evaluation.tags,
        suggested_improvements: evaluation.suggested_improvements,
        raw_response: evaluation.raw_response,
        llm_model: evaluation.llm_model,
      },
      relevance_score: 0, // Default value since we don't have this in the evaluation
      sentiment_score: 0, // Default value since we don't have this in the evaluation
    })
    .onConflict(['news_article_id', 'forum_name'])
    .merge();
}

export async function crawlNewsArticleEvaluations(): Promise<void> {
  logger.info('Starting news article evaluations...');
  let processedCount = 0;
  let hasMoreArticles = true;

  while (hasMoreArticles) {
    const articles = await getUnevaluatedArticles(50);
    if (articles.length === 0) {
      logger.info('No more unevaluated articles found.');
      hasMoreArticles = false;
      break;
    }

    for (const article of articles) {
      try {
        const evaluation = await evaluateArticle(article);
        await insertEvaluation(article.id, article, evaluation);
        processedCount++;
      } catch (err: any) {
        logger.error(`Error evaluating article ID ${article.id}: ${err.message}`);
        // continue with next article
      }
    }
  }

  logger.info(`Completed news article evaluations. Processed: ${processedCount} articles.`);
}

// If run standalone
if (require.main === module) {
  (async () => {
    try {
      await crawlNewsArticleEvaluations();
      process.exit(0);
    } catch (error: any) {
      logger.error(`Error running standalone news article evaluation crawl: ${error.message}`);
      process.exit(1);
    }
  })();
}
