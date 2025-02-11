const handleCommonTopics = async action => {
  const forum = document.getElementById('forum').value;
  const timeframe = document.getElementById('timeframe')?.value || '7d';
  const commonTopicsDiv = document.getElementById('topicsList');

  if (!forum) {
    errorDiv.textContent = 'Please select a forum';
    return;
  }

  commonTopicsDiv.innerHTML = '<p>Loading...</p>';
  errorDiv.textContent = '';

  try {
    let endpoint = '/api/common-topics';
    let method = 'GET';

    if (action === 'generate') {
      endpoint = '/api/common-topics/generate';
      method = 'POST';
    } else if (action === 'full') {
      endpoint = '/api/common-topics/full';
    }

    const response = await fetch(`${endpoint}${action !== 'generate' ? `?forums=${forum}` : ''}`, {
      method,
      headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      body: method === 'POST' ? JSON.stringify({ forum, timeframe }) : undefined,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    currentTopics = data.topics || data;
    displayTopicsList(currentTopics);
  } catch (error) {
    console.error('Common topics error:', error);
    errorDiv.textContent = `Error: ${error.message}`;
    commonTopicsDiv.innerHTML = '';
  }
}; 