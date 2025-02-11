import db from '../db/db';

async function checkMarketData() {
  try {
    // Get total count of records
    const totalCount = await db('token_market_data').count('* as total').first();
    
    // Get count by forum
    const forumCounts = await db('token_market_data')
      .select('forum_name', 'coingecko_id')
      .count('* as total')
      .groupBy('forum_name', 'coingecko_id');

    // Get date range
    const dateRange = await db('token_market_data')
      .select(
        db.raw('MIN(date) as earliest_date'),
        db.raw('MAX(date) as latest_date')
      )
      .first();

    // Get latest records for each forum
    const latestRecords = await db('token_market_data')
      .select('forum_name', 'coingecko_id', 'date', 'price', 'market_cap', 'volume')
      .orderBy('date', 'desc')
      .limit(5);

    console.log('\nMARKET DATA SUMMARY:');
    console.log('Total records:', totalCount?.total || 0);
    
    console.log('\nRECORDS BY FORUM:');
    forumCounts.forEach(count => {
      console.log(`${count.forum_name} (${count.coingecko_id}): ${count.total} records`);
    });

    console.log('\nDATE RANGE:');
    console.log('Earliest date:', dateRange?.earliest_date);
    console.log('Latest date:', dateRange?.latest_date);

    console.log('\nLATEST RECORDS:');
    latestRecords.forEach(record => {
      console.log(`\nForum: ${record.forum_name}`);
      console.log(`Date: ${record.date}`);
      console.log(`Price: $${Number(record.price).toFixed(2)}`);
      console.log(`Market Cap: $${Number(record.market_cap).toLocaleString()}`);
      console.log(`Volume: $${Number(record.volume).toLocaleString()}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error checking market data:', error);
    process.exit(1);
  }
}

checkMarketData(); 
