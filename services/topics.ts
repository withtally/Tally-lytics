import db from '../db/db';

export async function insertTopic(topic: any): Promise<void> {
  await db('topics').insert(topic).onConflict('id').merge();
}

export async function getAllTopics(): Promise<any[]> {
  return db('topics').select('*');
}

export async function getLatestTopicTimestamp(): Promise<Date | null> {
  const result = await db('topics').max('created_at as latest_timestamp').first();

  if (!result) return null;
  return new Date(result.latest_timestamp);
}
