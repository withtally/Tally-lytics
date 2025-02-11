import { Logger } from '../logging';
import { OpenAI } from 'openai';
import { withLLMErrorHandling } from '../errorHandling/llmErrors';

const logger = new Logger({ logFile: 'logs/chat-llm-service.log', level: 'info' });
const openai = new OpenAI();

/**
 * Generates a chat response based on provided context and user message
 * @param context The context from vector search results
 * @param message The user's message
 * @returns Generated response string
 */
export async function generateChatResponse(context: string, message: string): Promise<string> {
  return withLLMErrorHandling(async () => {
    logger.info('Generating chat response', {
      contextLength: context.length,
      messageLength: message.length,
    });

    const prompt = `
      Based on the following information from our database:
      ${context}

      Please answer this question: ${message}

      Guidelines:
      1. Use information from the provided context to support your answer
      2. If the context doesn't fully address the question, acknowledge what's missing
      3. Reference specific sources when citing information
      4. Keep the tone helpful and informative
      5. Format the response in a clear, readable way
      
      If you can't find relevant information in the context to answer the question, please say so and suggest how the question could be refined.
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that provides clear, concise answers based on the provided context. If the context is insufficient to answer the question, explain what additional information would be needed.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      logger.error('Empty response received from OpenAI');
      throw new Error('Empty response from OpenAI');
    }

    logger.info('Successfully generated chat response');
    return content;
  }, 'generateChatResponse');
}
