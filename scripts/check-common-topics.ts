import db from '../db/db';

async function checkCommonTopics() {
  try {
    const commonTopics = await db('common_topics')
      .where('forum_name', 'UNISWAP')
      .select('name', 'base_metadata', 'updated_at');

    console.log('\nCOMMON TOPICS FOR UNISWAP:');
    console.log('Total common topics:', commonTopics.length);

    if (commonTopics.length > 0) {
      console.log('\nLatest topics:');
      commonTopics.slice(0, 5).forEach(topic => {
        console.log(`\nName: ${topic.name}`);
        console.log(`Description: ${topic.base_metadata}`);
        console.log(`Last updated: ${topic.updated_at}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking common topics:', error);
    process.exit(1);
  }
}

checkCommonTopics();
