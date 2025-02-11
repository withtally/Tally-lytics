const DISCOURSE_URL = process.env.DISCOURSE_URL || '';
const API_KEY = process.env.API_KEY || '';
const API_USERNAME = process.env.API_USERNAME || '';

if (!DISCOURSE_URL || !API_KEY || !API_USERNAME) {
  console.error('Missing environment variables');
  process.exit(1);
}

export async function fetchLatestTopics(): Promise<any> {
  const response = await fetch(`${DISCOURSE_URL}/latest.json`, {
    method: 'GET',
    headers: {
      'Api-Key': API_KEY,
      'Api-Username': API_USERNAME,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error fetching topics');
  }

  return response.json();
}

export async function fetchPostsForTopic(topicId: number): Promise<any> {
  const response = await fetch(`${DISCOURSE_URL}/t/${topicId}.json`, {
    method: 'GET',
    headers: {
      'Api-Key': API_KEY,
      'Api-Username': API_USERNAME,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Error fetching posts');
  }

  return response.json();
}
