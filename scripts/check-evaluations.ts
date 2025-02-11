import db from '../db/db';

async function checkEvaluations() {
  try {
    // Check topics
    const topicsResult = await db('topics')
      .where('forum_name', 'UNISWAP')
      .count('* as total')
      .first();

    const evaluatedTopicsResult = await db('topics')
      .where('forum_name', 'UNISWAP')
      .whereNotNull('ai_summary')
      .count('* as total')
      .first();

    console.log('\nTOPICS:');
    console.log('Total topics:', topicsResult?.total || 0);
    console.log('Evaluated topics:', evaluatedTopicsResult?.total || 0);

    // Check posts
    const postsResult = await db('posts')
      .where('forum_name', 'UNISWAP')
      .count('* as total')
      .first();

    const evaluatedPostsResult = await db('post_evaluations')
      .join('posts', function () {
        this.on('post_evaluations.post_id', '=', 'posts.id').andOn(
          'post_evaluations.forum_name',
          '=',
          'posts.forum_name'
        );
      })
      .where('posts.forum_name', 'UNISWAP')
      .countDistinct('posts.id as total')
      .first();

    console.log('\nPOSTS:');
    console.log('Total posts:', postsResult?.total || 0);
    console.log('Evaluated posts:', evaluatedPostsResult?.total || 0);

    process.exit(0);
  } catch (error) {
    console.error('Error checking evaluations:', error);
    process.exit(1);
  }
}

checkEvaluations();
