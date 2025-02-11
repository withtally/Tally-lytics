import db from '../db/db';

async function checkPosts() {
  try {
    const posts = await db('posts')
      .where('forum_name', 'UNISWAP')
      .select('id', 'created_at', 'plain_text')
      .orderBy('created_at', 'desc')
      .limit(5);

    console.log('\nPOSTS FOR UNISWAP:');
    console.log('Total posts found:', posts.length);

    if (posts.length > 0) {
      console.log('\nLatest posts:');
      posts.forEach(post => {
        console.log(`\nID: ${post.id}`);
        console.log(`Created at: ${post.created_at}`);
        console.log(`Content preview: ${post.plain_text.slice(0, 100)}...`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking posts:', error);
    process.exit(1);
  }
}

checkPosts();
