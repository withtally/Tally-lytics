import db from '../db/db';

export async function topicNeedsReanalysis(topicId: number): Promise<boolean> {
  // Fetch the last analyzed timestamp for the topic
  const topic = await db('topics').where({ id: topicId }).select('last_analyzed').first();

  if (!topic) {
    throw new Error(`Topic with ID ${topicId} not found.`);
  }

  // Check if there are any posts created after the last_analyzed timestamp
  const newPosts = await db('posts')
    .where({ topic_id: topicId })
    .andWhere('created_at', '>', topic.last_analyzed || new Date(0)) // Default to 1970 if null
    .select('id');

  return newPosts.length > 0; // True if there are new posts, false otherwise
}
