import db from '../db/db';

export async function getLastCrawlTime(forumName: string): Promise<Date> {
  const lastCrawl = await db('crawl_status')
    .where({ id: 'latest_crawl', forum_name: forumName })
    .first();
  return lastCrawl ? new Date(lastCrawl.last_crawl_at) : new Date(0);
}

export async function updateCrawlTime(forumName: string): Promise<void> {
  const latestCrawlTime = new Date();
  await db('crawl_status')
    .insert({
      id: 'latest_crawl',
      forum_name: forumName,
      last_crawl_at: latestCrawlTime,
    })
    .onConflict(['id', 'forum_name'])
    .merge();
}
