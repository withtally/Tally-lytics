import db from '../db';

export async function insertPost(post: any) {
  // Insert the post with both cooked and plain text content
  const [insertedId] = await db('posts')
    .insert({
      id: post.id,
      topic_id: post.topic_id,
      username: post.username,
      cooked: post.cooked, // Store the cooked HTML content
      plain_text: post.plain_text, // Store the parsed plain text version
      created_at: post.created_at,
      updated_at: post.updated_at,
    })
    .onConflict('id')
    .merge(); // Upsert to avoid duplicates

  // console.log(`Inserted/updated post ID: ${post.id}`);
  return insertedId;
}

export async function getLatestPostTimestamp(): Promise<Date | null> {
  const result = await db('posts').max('created_at as latest_timestamp').first();

  if (!result) return null;
  return new Date(result.latest_timestamp);
}
