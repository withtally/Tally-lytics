/* eslint-env browser, es6 */
/* global fetch, console, document, window */

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const searchByTypeButton = document.getElementById('searchByType');
  const searchAllButton = document.getElementById('searchAll');
  const resultsDiv = document.getElementById('results');
  const errorDiv = document.getElementById('error');
  const startAllCrawlsButton = document.getElementById('startAllCrawls');
  const startCrawlButton = document.getElementById('startCrawl');
  const stopCrawlButton = document.getElementById('stopCrawl');
  const refreshCrawlStatusButton = document.getElementById('refreshCrawlStatus');
  const crawlStatusResultsDiv = document.getElementById('crawlStatusResults');
  const startCronButton = document.getElementById('startCron');
  const stopCronButton = document.getElementById('stopCron');
  const cronStatusButton = document.getElementById('cronStatus');
  const cronResultsDiv = document.getElementById('cronResults');
  const serverStatusButton = document.getElementById('serverStatus');
  const statusResultsDiv = document.getElementById('statusResults');
  const viewLogsButton = document.getElementById('viewLogs');
  const logsResultsDiv = document.getElementById('logsResults');
  const refreshTopicsButton = document.getElementById('refreshTopics');
  const backToTopicsButton = document.getElementById('backToTopics');
  const viewFullTopicsButton = document.getElementById('viewFullTopics');
  const sendChatButton = document.getElementById('sendChat');

  // New elements
  const startNewsCrawlButton = document.getElementById('startNewsCrawl');
  const fetchNewsButton = document.getElementById('fetchNews');
  const newsResultsDiv = document.getElementById('newsResults');
  const startMarketCapCrawlButton = document.getElementById('startMarketCapCrawl');
  const fetchMarketCapButton = document.getElementById('fetchMarketCap');
  const marketCapResultsDiv = document.getElementById('marketCapResults');
  const generateCommonTopicsButton = document.getElementById('generateCommonTopics');
  const chatResultsDiv = document.getElementById('chatResults');

  // Helper functions for formatting
  const formatTime = timestamp => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });
  };

  const getStatusBadge = status => {
    const badges = {
      running: '<span class="badge badge-success">Running</span>',
      failed: '<span class="badge badge-error">Failed</span>',
      ok: '<span class="badge badge-success">OK</span>',
    };
    return badges[status] || `<span class="badge badge-neutral">${status}</span>`;
  };

  const formatProgress = progress => {
    if (!progress) return '';
    let html = '<div class="progress-section">';

    if (progress.evaluations) {
      html += `
        <div class="evaluation-stats">
          <h4>Evaluations</h4>
          <ul>
            <li>Topics: ${progress.evaluations.topics}</li>
            <li>Posts: ${progress.evaluations.posts}</li>
            <li>Threads: ${progress.evaluations.threads}</li>
          </ul>
        </div>`;
    }

    if (progress.topics) {
      const percentage =
        progress.topics.total > 0
          ? ((progress.topics.processed / progress.topics.total) * 100).toFixed(1)
          : 0;
      html += `
        <div class="topic-progress">
          <h4>Topics Progress</h4>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${percentage}%"></div>
          </div>
          <p>${progress.topics.processed} / ${progress.topics.total} (${percentage}%)</p>
        </div>`;
    }

    html += '</div>';
    return html;
  };

  const formatResults = results => {
    if (!results || results.length === 0) {
      return '<div class="card"><p>No results found.</p></div>';
    }
    return results
      .map(
        result => `
          <div class="result-item card">
            <h3>${result.title || 'No Title'}</h3>
            <p><strong>Type:</strong> ${result.type}</p>
            <p><strong>ID:</strong> ${result.id}</p>
            <p><strong>Forum:</strong> ${result.forum_name || result.forumName}</p>
            ${result.content ? `<p><strong>Content:</strong> ${result.content}</p>` : ''}
            ${result.similarity ? `<p><strong>Similarity:</strong> ${(result.similarity * 100).toFixed(1)}%</p>` : ''}
            ${result.url ? `<p><a href="${result.url}" target="_blank" rel="noopener noreferrer">View Original</a></p>` : ''}
          </div>
        `
      )
      .join('');
  };

  // New function to format follow-up suggestions
  const formatFollowUpSuggestions = suggestions => {
    if (!suggestions || suggestions.length === 0) {
      return '<p>No follow-up suggestions available.</p>';
    }
    return `
      <ul class="follow-up-list">
        ${suggestions
          .map(
            suggestion => `
          <li class="follow-up-item">
            <button class="follow-up-button" data-query="${suggestion}">${suggestion}</button>
          </li>
        `
          )
          .join('')}
      </ul>
    `;
  };

  // New function to format common topics
  const formatCommonTopics = topics => {
    if (!topics || topics.length === 0) {
      return '<p>No common topics available.</p>';
    }
    return `
      <div class="common-topics-grid">
        ${topics
          .map(
            topic => `
          <div class="topic-card">
            <h4>${topic.title}</h4>
            <p>${topic.description || ''}</p>
            <p><strong>Frequency:</strong> ${topic.frequency || 'N/A'}</p>
            <button class="topic-search-button" data-query="${topic.title}">Search This Topic</button>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  };

  const formatAllResults = data => {
    let output = '<div class="search-results">';

    if (data.topics && data.topics.length > 0) {
      output += '<h2>Topics</h2>';
      output += formatResults(data.topics.map(topic => ({ ...topic, type: 'topic' })));
    }

    if (data.posts && data.posts.length > 0) {
      output += '<h2>Posts</h2>';
      output += formatResults(data.posts.map(post => ({ ...post, type: 'post' })));
    }

    if (data.snapshot && data.snapshot.length > 0) {
      output += '<h2>Snapshots</h2>';
      output += formatResults(data.snapshot.map(snap => ({ ...snap, type: 'snapshot' })));
    }

    if (data.tally && data.tally.length > 0) {
      output += '<h2>Tally Proposals</h2>';
      output += formatResults(data.tally.map(tally => ({ ...tally, type: 'tally' })));
    }

    if (output === '<div class="search-results">') {
      return '<div class="card"><p>No results found.</p></div>';
    }

    output += '</div>';
    return output;
  };

  const formatCronResults = data => {
    if (data.error) {
      return `<p>Error: ${data.error}. Details: ${data.details || 'None'}</p>`;
    } else if (data.message) {
      return `
        <div class="card">
          <p>
            <strong>Message:</strong> ${data.message}
          </p>
          ${formatCronStatus(data.status)}
        </div>
      `;
    } else {
      return `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
  };

  const formatCronStatus = status => {
    return `
      <div class="card">
        <p>
          <strong>Enabled:</strong> ${status.enabled}
        </p>
        <p>
          <strong>Schedule:</strong> ${status.schedule}
        </p>
        <p>
          <strong>Next Run:</strong> ${status.nextRun || 'Not Scheduled'}
        </p>
        <p>
          <strong>Last Run:</strong> ${status.lastRun || 'Never Run'}
        </p>
      </div>
    `;
  };

  const formatStatusResults = data => {
    if (data.error) {
      return `<p class="error">Error: ${data.error}. Details: ${data.details || 'None'}</p>`;
    }

    let html = `
      <div class="status-container">
        <div class="status-header">
          <h3>System Status ${getStatusBadge(data.status)}</h3>
          <p class="timestamp">Last Updated: ${formatTime(data.timestamp)}</p>
        </div>
        
        <div class="services-status">
          <div class="service-card">
            <h3>Search Service ${getStatusBadge(data.services.search)}</h3>
          </div>
          
          <div class="service-card">
            <h3>Crawler Service ${getStatusBadge(data.services.crawler.status)}</h3>
            <div class="active-jobs">
              <h4>Active Jobs</h4>
              ${data.services.crawler.activeJobs
                .map(
                  job => `
                  <div class="job-card ${job.status}">
                    <div class="job-header">
                      <h4>${job.forumName}</h4>
                      ${getStatusBadge(job.status)}
                    </div>
                    <div class="job-details">
                      <p>Started: ${formatTime(job.startTime)}</p>
                      ${job.endTime ? `<p>Ended: ${formatTime(job.endTime)}</p>` : ''}
                      ${job.lastError ? `<p class="error">Error: ${job.lastError}</p>` : ''}
                      ${formatProgress(job.progress)}
                    </div>
                  </div>
                `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>`;

    return html;
  };

  const formatLogs = logs => {
    if (!logs) return '<p>No logs available.</p>';

    const lines = logs
      .split('\n')
      .filter(line => line.trim())
      .reverse();

    const formattedLines = lines.map(line => {
      let className = 'log-line';
      if (line.includes('ERROR') || line.includes('error')) {
        className += ' log-error';
      } else if (line.includes('WARN') || line.includes('warn')) {
        className += ' log-warning';
      } else if (line.includes('INFO') || line.includes('info')) {
        className += ' log-info';
      }

      // Match ISO timestamps with optional milliseconds and timezone
      const timestampMatch = line.match(
        /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:?\d{2})?/
      );
      if (timestampMatch) {
        const timestamp = new Date(timestampMatch[0]);
        if (!isNaN(timestamp)) {
          // Check if date is valid
          const formattedTime = timestamp.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short',
          });
          line = line.replace(timestampMatch[0], formattedTime);
        }
      }

      return `<div class="${className}">${line}</div>`;
    });

    return `
      <div class="logs-content">
        ${formattedLines.join('')}
      </div>
    `;
  };

  const formatCrawlStatus = data => {
    if (!data || !data.services || !data.services.crawler) {
      return '<p>No crawler status available.</p>';
    }

    const { activeJobs } = data.services.crawler;
    if (!activeJobs || activeJobs.length === 0) {
      return '<p>No active crawls.</p>';
    }

    return activeJobs
      .map(
        job => `
      <div class="crawl-status-item card ${job.status}">
        <div class="crawl-header">
          <h4>${job.forumName}</h4>
          ${getStatusBadge(job.status)}
        </div>
        <div class="crawl-details">
          <p><strong>Started:</strong> ${formatTime(job.startTime)}</p>
          ${job.endTime ? `<p><strong>Ended:</strong> ${formatTime(job.endTime)}</p>` : ''}
          ${job.lastError ? `<p class="error"><strong>Error:</strong> ${job.lastError}</p>` : ''}
          ${formatProgress(job.progress)}
        </div>
      </div>
    `
      )
      .join('');
  };

  // Update crawl status
  const updateCrawlStatus = async () => {
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      crawlStatusResultsDiv.innerHTML = formatCrawlStatus(data);
    } catch (error) {
      console.error('Error updating crawl status:', error);
      crawlStatusResultsDiv.innerHTML = '<p class="error">Failed to fetch crawl status.</p>';
    }
  };

  // Handle crawl actions
  const handleCrawl = async (action, forum = '') => {
    errorDiv.textContent = '';

    try {
      let url;
      if (action === 'start-all') {
        url = '/api/crawl/start/all';
      } else {
        const selectedForum = forum || document.getElementById('crawlForum').value;
        if (!selectedForum && action !== 'status') {
          errorDiv.textContent = 'Please select a forum';
          return;
        }
        url = `/api/crawl/${action}/${selectedForum}`;
      }

      const response = await fetch(url, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      await updateCrawlStatus(); // Refresh the status after action

      // Show success message
      const message = document.createElement('div');
      message.className = 'success-message';
      message.textContent = data.message || 'Action completed successfully';
      crawlStatusResultsDiv.insertAdjacentElement('beforebegin', message);
      window.setTimeout(() => message.remove(), 3000);
    } catch (error) {
      console.error('Crawl error:', error);
      errorDiv.textContent = `Error: ${error.message}`;
    }
  };

  // Event listeners for crawl controls
  refreshCrawlStatusButton?.addEventListener('click', updateCrawlStatus);
  startAllCrawlsButton?.addEventListener('click', () => handleCrawl('start-all'));
  startCrawlButton?.addEventListener('click', () => handleCrawl('start'));
  stopCrawlButton?.addEventListener('click', () => handleCrawl('stop'));

  // Initialize crawl status on tab switch
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.tab === 'crawl') {
        updateCrawlStatus();
      }
    });
  });

  // Auto-update crawl status every 30 seconds if on crawl tab
  window.setInterval(() => {
    if (document.querySelector('#crawl-tab.active')) {
      updateCrawlStatus();
    }
  }, 30000);

  // Initialize first load
  if (document.querySelector('#crawl-tab.active')) {
    updateCrawlStatus();
  }

  // API handling functions
  const handleStatus = async () => {
    statusResultsDiv.innerHTML = '';
    errorDiv.textContent = '';

    try {
      const response = await fetch('/api/health');

      if (!response.ok) {
        const errorText = await response.text();
        errorDiv.textContent = `HTTP error! status: ${response.status}, message: ${errorText}`;
        return;
      }

      const data = await response.json();
      let output = formatStatusResults(data);
      statusResultsDiv.innerHTML = output;
    } catch (error) {
      console.error('Error:', error);
      errorDiv.textContent = `Error during request: ${error}`;
    }
  };

  const handleSearch = async (url, isSearchAll = false) => {
    resultsDiv.innerHTML = '';
    errorDiv.textContent = '';
    const formData = getFormData();

    // Validate required fields
    if (!formData.query) {
      errorDiv.textContent = 'Please enter a search query';
      return;
    }

    if (!formData.forum) {
      errorDiv.textContent = 'Please enter a forum name';
      return;
    }

    try {
      // Show loading state
      resultsDiv.innerHTML = '<div class="card"><p>Searching...</p></div>';

      const searchData = {
        query: formData.query,
        forum: formData.forum.toUpperCase(),
        type: formData.type || 'topic',
        limit: formData.limit || 10,
        threshold: formData.threshold || 0.5,
        boostRecent: formData.boostRecent || false,
        boostPopular: formData.boostPopular || false,
        useCache: formData.useCache || false,
        useQueryAugmentation: formData.useQueryAugmentation || false,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        errorDiv.textContent = `HTTP error! status: ${response.status}, message: ${errorText}`;
        resultsDiv.innerHTML = '';
        return;
      }

      const data = await response.json();

      // Handle empty results
      if (isSearchAll) {
        if (
          !data.topics?.length &&
          !data.posts?.length &&
          !data.snapshot?.length &&
          !data.tally?.length
        ) {
          resultsDiv.innerHTML = '<div class="card"><p>No results found.</p></div>';
          return;
        }
      } else {
        if (!data.results || data.results.length === 0) {
          resultsDiv.innerHTML = '<div class="card"><p>No results found.</p></div>';
          return;
        }
      }

      let output = isSearchAll ? formatAllResults(data) : formatResults(data.results);
      resultsDiv.innerHTML = output;

      // If there are follow-up suggestions, display them
      if (data.followUpSuggestions) {
        document.getElementById('followUpSuggestions').innerHTML = formatFollowUpSuggestions(
          data.followUpSuggestions
        );
      }
    } catch (error) {
      console.error('Search error:', error);
      errorDiv.textContent = `Error during search request: ${error.message}`;
      resultsDiv.innerHTML = '';
    }
  };

  const handleCron = async (url, method = 'POST') => {
    cronResultsDiv.innerHTML = '';
    errorDiv.textContent = '';
    const formData = getCronFormData();

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify(formData) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        errorDiv.textContent = `HTTP error! status: ${response.status}, message: ${errorText}`;
        return;
      }

      const data = await response.json();
      let output = formatCronResults(data);
      cronResultsDiv.innerHTML = output;
    } catch (error) {
      console.error('Error:', error);
      errorDiv.textContent = `Error during request: ${error}`;
    }
  };

  const handleLogs = async () => {
    logsResultsDiv.innerHTML = '';
    errorDiv.textContent = '';
    const forum = document.getElementById('logForum').value;

    try {
      const response = await fetch(`/api/logs/${forum}`);
      if (!response.ok) {
        const errorText = await response.text();
        errorDiv.textContent = `HTTP error! status: ${response.status}, message: ${errorText}`;
        return;
      }

      const data = await response.text();
      const formattedLogs = formatLogs(data);
      logsResultsDiv.innerHTML = formattedLogs;
    } catch (error) {
      console.error('Error:', error);
      errorDiv.textContent = `Error during request: ${error}`;
    }
  };

  // Form data getters
  const getFormData = () => {
    return {
      query: document.getElementById('query').value,
      type: document.getElementById('type').value,
      forum: document.getElementById('forum').value,
      limit: parseInt(document.getElementById('limit').value),
      threshold: parseFloat(document.getElementById('threshold').value) || undefined,
      boostRecent: document.getElementById('boostRecent').checked,
      boostPopular: document.getElementById('boostPopular').checked,
      useCache: document.getElementById('useCache').checked,
      useQueryAugmentation: document.getElementById('useQueryAugmentation').checked,
    };
  };

  const getCronFormData = () => ({
    schedule: document.getElementById('cronSchedule').value,
  });

  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  const switchTab = tabId => {
    // Hide all tab contents
    tabContents.forEach(content => {
      content.style.display = 'none';
      content.classList.remove('active');
    });

    // Deactivate all tabs
    tabButtons.forEach(button => {
      button.classList.remove('active');
      button.setAttribute('aria-selected', 'false');
    });

    // Show selected tab content
    const selectedContent = document.getElementById(`${tabId}-tab`);
    if (selectedContent) {
      selectedContent.style.display = 'block';
      selectedContent.classList.add('active');
    }

    // Activate selected tab
    const selectedTab = document.querySelector(`[data-tab="${tabId}"]`);
    if (selectedTab) {
      selectedTab.classList.add('active');
      selectedTab.setAttribute('aria-selected', 'true');
    }

    // If switching to status tab, refresh the status
    if (tabId === 'status') {
      handleStatus().catch(error => {
        console.error('Error initializing status:', error);
        errorDiv.textContent = `Error initializing status: ${error.message}`;
      });
    }
  };

  // Add click handlers to tabs
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      switchTab(button.dataset.tab);
    });
  });

  // Event Listeners
  searchByTypeButton?.addEventListener('click', () => {
    console.log('Search by type clicked');
    handleSearch('/api/searchByType', false);
  });

  searchAllButton?.addEventListener('click', () => {
    console.log('Search all clicked');
    handleSearch('/api/searchAll', true);
  });
  startCronButton?.addEventListener('click', () => {
    const formData = getCronFormData();
    if (!formData.schedule) {
      errorDiv.textContent = 'Please enter a cron schedule';
      return;
    }
    handleCron('/api/cron/start', 'POST');
  });
  stopCronButton?.addEventListener('click', () => handleCron('/api/cron/stop', 'POST'));
  cronStatusButton?.addEventListener('click', () => handleCron('/api/cron/status', 'GET'));
  serverStatusButton?.addEventListener('click', handleStatus);
  viewLogsButton?.addEventListener('click', handleLogs);

  // Add new function to load forums
  const loadSupportedForums = async () => {
    try {
      console.log('Loading forums from health endpoint...');
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Received health data:', data);

      // Extract forums from the crawler service's active jobs and available forums
      const forums = new Set();

      // Add forums from active jobs
      if (data.services?.crawler?.activeJobs) {
        data.services.crawler.activeJobs.forEach(job => {
          if (job.forumName) forums.add(job.forumName);
        });
      }

      // Add any additional forums from the crawler service's available forums
      if (data.services?.crawler?.availableForums) {
        data.services.crawler.availableForums.forEach(forum => forums.add(forum));
      }

      const forumArray = Array.from(forums);
      console.log('Processed forums:', forumArray);

      if (forumArray.length === 0) {
        console.warn('No forums found in health data');
        return;
      }

      // Update all forum selectors
      const forumSelects = [
        document.getElementById('forum'),
        document.getElementById('crawlForum'),
        document.getElementById('logForum'),
      ];

      forumSelects.forEach(select => {
        if (!select) {
          console.warn(`Could not find select element`);
          return;
        }

        console.log(`Updating ${select.id} with forums`);

        if (select.tagName === 'SELECT') {
          // Clear existing options
          select.innerHTML = '';

          // Add placeholder option
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Select a forum...';
          select.appendChild(placeholder);

          // Add forum options
          forumArray.sort().forEach(forum => {
            const option = document.createElement('option');
            option.value = forum;
            option.textContent = forum;
            select.appendChild(option);
          });
        } else if (select.tagName === 'INPUT') {
          // For input fields, set up datalist
          const datalistId = `${select.id}List`;
          let datalist = document.getElementById(datalistId);

          if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = datalistId;
            select.parentNode.appendChild(datalist);
            select.setAttribute('list', datalistId);
          }

          datalist.innerHTML = forumArray
            .sort()
            .map(forum => `<option value="${forum}">${forum}</option>`)
            .join('');
        }
      });
    } catch (error) {
      console.error('Error loading forums:', error);
      errorDiv.textContent = 'Error loading supported forums. Please try refreshing the page.';
    }
  };

  // Initialize first tab and load forums
  const initializeApp = async () => {
    try {
      await loadSupportedForums();
      const initialTab = document.querySelector('.tab-button.active');
      if (initialTab) {
        switchTab(initialTab.dataset.tab);
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      errorDiv.textContent = 'Error initializing application. Please try refreshing the page.';
    }
  };

  // Replace the old initialization with the new one
  initializeApp();

  // Add new event listeners
  document.getElementById('generateSimile')?.addEventListener('click', handleGenerateSimile);
  document.getElementById('generateFollowUp')?.addEventListener('click', handleGenerateFollowUp);
  document.getElementById('fetchCommonTopics')?.addEventListener('click', handleFetchCommonTopics);

  // Add click handler for follow-up suggestion buttons
  document.addEventListener('click', e => {
    if (
      e.target.classList.contains('follow-up-button') ||
      e.target.classList.contains('topic-search-button')
    ) {
      const query = e.target.dataset.query;
      if (query) {
        document.getElementById('query').value = query;
        document.getElementById('searchByType').click();
      }
    }
  });

  // New function to handle generating similar queries
  const handleGenerateSimile = async () => {
    const formData = getFormData();
    if (!formData.query) {
      errorDiv.textContent = 'Please enter a search query';
      return;
    }

    try {
      // Show loading state
      document.getElementById('generateSimile').disabled = true;
      document.getElementById('generateSimile').textContent = 'Generating...';
      errorDiv.textContent = '';

      console.log('Generating similar query for:', formData.query);

      const response = await fetch('/api/generateSimile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: formData.query,
          forum: formData.forum,
        }),
      });

      console.log('Generate simile response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate simile error:', errorText);
        errorDiv.textContent = `Error generating similar query: ${errorText}`;
        return;
      }

      const data = await response.json();
      console.log('Generated similar query:', data);

      if (data.similarQuery) {
        // Show both queries for comparison
        const queryInput = document.getElementById('query');
        const oldQuery = queryInput.value;
        queryInput.value = data.similarQuery;

        // Add comparison info below the input
        const comparisonDiv = document.createElement('div');
        comparisonDiv.className = 'query-comparison card';
        comparisonDiv.innerHTML = `
          <p><strong>Original Query:</strong> ${oldQuery}</p>
          <p><strong>Generated Query:</strong> ${data.similarQuery}</p>
          ${data.explanation ? `<p><strong>Explanation:</strong> ${data.explanation}</p>` : ''}
        `;

        // Insert after the search-main card
        const searchMainCard = document.querySelector('.search-main.card');
        searchMainCard.parentNode.insertBefore(comparisonDiv, searchMainCard.nextSibling);
      }
    } catch (error) {
      console.error('Error:', error);
      errorDiv.textContent = `Error generating similar query: ${error.message}`;
    } finally {
      document.getElementById('generateSimile').disabled = false;
      document.getElementById('generateSimile').textContent = 'Generate Similar Query';
    }
  };

  // New function to handle generating follow-up questions
  const handleGenerateFollowUp = async () => {
    const formData = getFormData();
    if (!formData.query) {
      errorDiv.textContent = 'Please enter a search query first';
      return;
    }

    try {
      // Show loading state
      const followUpButton = document.getElementById('generateFollowUp');
      const followUpDiv = document.getElementById('followUpSuggestions');
      followUpButton.disabled = true;
      followUpButton.textContent = 'Generating...';
      followUpDiv.innerHTML = '<p>Generating follow-up questions...</p>';
      errorDiv.textContent = '';

      console.log('Generating follow-up questions for:', formData);

      const response = await fetch('/api/generateFollowUp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: formData.query,
          forum: formData.forum,
          context: formData.results, // Include search results for context if available
        }),
      });

      console.log('Generate follow-up response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Generate follow-up error:', errorText);
        errorDiv.textContent = `Error generating follow-up questions: ${errorText}`;
        followUpDiv.innerHTML = '<p>Error generating follow-up questions.</p>';
        return;
      }

      const data = await response.json();
      console.log('Generated follow-up questions:', data);

      if (data.suggestions) {
        followUpDiv.innerHTML = formatFollowUpSuggestions(data.suggestions);

        // Add debug info if available
        if (data.debug) {
          const debugInfo = document.createElement('div');
          debugInfo.className = 'debug-info';
          debugInfo.innerHTML = `
            <details>
              <summary>Debug Information</summary>
              <pre>${JSON.stringify(data.debug, null, 2)}</pre>
            </details>
          `;
          followUpDiv.appendChild(debugInfo);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      errorDiv.textContent = `Error generating follow-up questions: ${error.message}`;
      document.getElementById('followUpSuggestions').innerHTML =
        '<p>Error generating follow-up questions.</p>';
    } finally {
      const followUpButton = document.getElementById('generateFollowUp');
      followUpButton.disabled = false;
      followUpButton.textContent = 'Generate Follow-up Questions';
    }
  };

  // New function to handle fetching common topics
  const handleFetchCommonTopics = async () => {
    const timeframe = document.getElementById('topicTimeframe').value;
    const forum = document.getElementById('forum').value;
    const commonTopicsDiv = document.getElementById('commonTopics');
    const fetchButton = document.getElementById('fetchCommonTopics');

    if (!forum) {
      errorDiv.textContent = 'Please select a forum first';
      return;
    }

    try {
      // Show loading state
      fetchButton.disabled = true;
      fetchButton.textContent = 'Fetching...';
      commonTopicsDiv.innerHTML = '<p>Loading common topics...</p>';
      errorDiv.textContent = '';

      console.log('Fetching common topics:', { forum, timeframe });

      const response = await fetch(`/api/common-topics?forums=${forum}`);

      console.log('Fetch common topics response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Fetch common topics error:', errorText);
        errorDiv.textContent = `Error fetching common topics: ${errorText}`;
        commonTopicsDiv.innerHTML = '<p>Error fetching common topics.</p>';
        return;
      }

      const data = await response.json();
      console.log('Fetched common topics:', data);

      if (data.topics) {
        commonTopicsDiv.innerHTML = formatCommonTopics(data.topics);

        // Add statistics if available
        if (data.stats) {
          const statsDiv = document.createElement('div');
          statsDiv.className = 'topics-stats card';
          statsDiv.innerHTML = `
            <h4>Statistics</h4>
            <p><strong>Total Topics:</strong> ${data.stats.totalTopics || 'N/A'}</p>
            <p><strong>Time Range:</strong> ${data.stats.timeRange || timeframe}</p>
            <p><strong>Last Updated:</strong> ${formatTime(data.stats.lastUpdated)}</p>
          `;
          commonTopicsDiv.insertBefore(statsDiv, commonTopicsDiv.firstChild);
        }

        // Add debug info if available
        if (data.debug) {
          const debugInfo = document.createElement('div');
          debugInfo.className = 'debug-info';
          debugInfo.innerHTML = `
            <details>
              <summary>Debug Information</summary>
              <pre>${JSON.stringify(data.debug, null, 2)}</pre>
            </details>
          `;
          commonTopicsDiv.appendChild(debugInfo);
        }
      } else {
        commonTopicsDiv.innerHTML = '<p>No common topics available.</p>';
      }
    } catch (error) {
      console.error('Error:', error);
      errorDiv.textContent = `Error fetching common topics: ${error.message}`;
      commonTopicsDiv.innerHTML = '<p>Error fetching common topics.</p>';
    } finally {
      fetchButton.disabled = false;
      fetchButton.textContent = 'Fetch Common Topics';
    }
  };

  // New formatting functions for news and market cap
  const formatNewsResults = news => {
    if (!news || news.length === 0) {
      return '<p>No news articles found.</p>';
    }

    return news
      .map(
        article => `
      <div class="news-item card">
        <h3>${article.title}</h3>
        <p>${article.description || ''}</p>
        <p><strong>Source:</strong> ${article.source}</p>
        <p><strong>Published:</strong> ${formatTime(article.published_at)}</p>
        ${article.url ? `<p><a href="${article.url}" target="_blank" rel="noopener noreferrer">Read More</a></p>` : ''}
      </div>
    `
      )
      .join('');
  };

  const formatMarketCapResults = data => {
    if (!data || data.length === 0) {
      return '<p>No market cap data found.</p>';
    }

    return data
      .map(
        item => `
      <div class="market-cap-item card">
        <h3>${item.token_symbol}</h3>
        <p><strong>Price:</strong> $${item.price.toFixed(2)}</p>
        <p><strong>Market Cap:</strong> $${item.market_cap.toLocaleString()}</p>
        <p><strong>Volume (24h):</strong> $${item.volume_24h.toLocaleString()}</p>
        <p><strong>Updated:</strong> ${formatTime(item.timestamp)}</p>
      </div>
    `
      )
      .join('');
  };

  // New API handling functions
  const handleNews = async action => {
    const forum = document.getElementById('newsForum').value;
    newsResultsDiv.innerHTML = '<p>Loading...</p>';
    errorDiv.textContent = '';

    try {
      let response;
      if (action === 'crawl') {
        response = await fetch('/api/news/crawl', {
          method: 'POST',
        });
      } else {
        if (!forum) {
          errorDiv.textContent = 'Please select a forum';
          return;
        }
        response = await fetch(`/api/news/${forum}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      if (action === 'crawl') {
        newsResultsDiv.innerHTML = `<p>${data.message}</p>`;
      } else {
        newsResultsDiv.innerHTML = formatNewsResults(data.data);
      }
    } catch (error) {
      console.error('News error:', error);
      errorDiv.textContent = `Error: ${error.message}`;
      newsResultsDiv.innerHTML = '';
    }
  };

  const handleMarketCap = async action => {
    const forum = document.getElementById('marketCapForum').value;
    marketCapResultsDiv.innerHTML = '<p>Loading...</p>';
    errorDiv.textContent = '';

    try {
      let response;
      if (action === 'crawl') {
        response = await fetch('/api/marketcap/crawl', {
          method: 'POST',
        });
      } else {
        if (!forum) {
          errorDiv.textContent = 'Please select a forum';
          return;
        }
        response = await fetch(`/api/marketcap/${forum}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      if (action === 'crawl') {
        marketCapResultsDiv.innerHTML = `<p>${data.message}</p>`;
      } else {
        marketCapResultsDiv.innerHTML = formatMarketCapResults(data.data);
      }
    } catch (error) {
      console.error('Market cap error:', error);
      errorDiv.textContent = `Error: ${error.message}`;
      marketCapResultsDiv.innerHTML = '';
    }
  };

  const handleCommonTopics = async action => {
    const forum = document.getElementById('forum').value;
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

      const response = await fetch(`${endpoint}?forums=${forum}`, {
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' ? JSON.stringify({ forum }) : undefined,
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

  const handleChat = async () => {
    const message = document.getElementById('chatInput').value.trim();
    const forum = document.getElementById('forum').value; // Get the currently selected forum

    if (!message) {
      errorDiv.textContent = 'Please enter a message';
      return;
    }

    chatResultsDiv.innerHTML = '<p>Processing...</p>';
    errorDiv.textContent = '';

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          forumNames: forum ? [forum] : undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();

      // Format the response with sources if available
      let html = `
        <div class="chat-response card">
          <div class="answer">
            <p><strong>Response:</strong></p>
            <p>${data.answer}</p>
          </div>`;

      if (data.sources && data.sources.length > 0) {
        html += `
          <div class="sources">
            <p><strong>Sources:</strong></p>
            <ul>
              ${data.sources
                .map(
                  source => `
                <li>
                  <p><strong>${source.title}</strong></p>
                  <p>${source.content}</p>
                  <p><em>Similarity: ${(source.similarity * 100).toFixed(1)}%</em></p>
                </li>
              `
                )
                .join('')}
            </ul>
          </div>`;
      }

      html += '</div>';
      chatResultsDiv.innerHTML = html;
      document.getElementById('chatInput').value = '';
    } catch (error) {
      console.error('Chat error:', error);
      errorDiv.textContent = `Error: ${error.message}`;
      chatResultsDiv.innerHTML = '';
    }
  };

  // Add new event listeners
  startNewsCrawlButton?.addEventListener('click', () => handleNews('crawl'));
  fetchNewsButton?.addEventListener('click', () => handleNews('fetch'));
  startMarketCapCrawlButton?.addEventListener('click', () => handleMarketCap('crawl'));
  fetchMarketCapButton?.addEventListener('click', () => handleMarketCap('fetch'));
  generateCommonTopicsButton?.addEventListener('click', () => handleCommonTopics('generate'));
  viewFullTopicsButton?.addEventListener('click', () => handleCommonTopics('full'));
  sendChatButton?.addEventListener('click', handleChat);

  // Common Topics Functions
  let currentTopics = [];

  // Remove duplicate function definitions and consolidate event listeners
  const topicsListElement = document.getElementById('topicsList');
  const topicDetailsElement = document.getElementById('topicDetails');

  const refreshTopics = async () => {
    try {
      console.log('Refreshing topics...');
      topicsListElement.innerHTML = '<p>Loading topics...</p>';

      const response = await fetch('/api/common-topics');
      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received topics data:', data);

      currentTopics = data.topics || data; // Handle both response formats
      displayTopicsList(currentTopics);
    } catch (error) {
      console.error('Failed to fetch common topics:', error);
      errorDiv.textContent = 'Failed to fetch common topics: ' + error.message;
      topicsListElement.innerHTML = '<p>Failed to load topics. Please try again.</p>';
    }
  };

  const displayTopicsList = topics => {
    console.log('Displaying topics:', topics);
    if (!topicsListElement) {
      console.error('Topics list element not found');
      return;
    }

    topicsListElement.innerHTML = '';

    if (!topics || topics.length === 0) {
      topicsListElement.innerHTML = '<p>No topics available.</p>';
      return;
    }

    topics.forEach((topic, index) => {
      const topicElement = document.createElement('div');
      topicElement.className = 'topic-item';
      topicElement.innerHTML = `
        <h4>${topic.name || 'Unnamed Topic'}</h4>
        <p class="topic-metadata">Forum: ${topic.forum_name || 'Unknown Forum'}</p>
        ${topic.base_metadata ? `<p class="topic-description">${topic.base_metadata}</p>` : ''}
        ${topic.updated_at ? `<p class="topic-metadata">Last Updated: ${formatTime(topic.updated_at)}</p>` : ''}
        <button class="view-details secondary" data-index="${index}">View Details</button>
      `;

      const viewDetailsButton = topicElement.querySelector('.view-details');
      viewDetailsButton.addEventListener('click', () => {
        console.log('Viewing details for topic:', topic);
        displayTopicDetails(topic);
      });

      topicsListElement.appendChild(topicElement);
    });
  };

  const displayTopicDetails = topic => {
    console.log('Displaying topic details:', topic);
    if (!topicDetailsElement) {
      console.error('Topic details element not found');
      return;
    }

    const topicsList = document.querySelector('.topics-list');
    const topicDetails = document.querySelector('.topic-details');

    // Parse full_data if it exists and is a string
    let fullData = {};
    if (topic.full_data) {
      try {
        fullData =
          typeof topic.full_data === 'string' ? JSON.parse(topic.full_data) : topic.full_data;
      } catch (e) {
        console.error('Error parsing full_data:', e);
        fullData = { error: 'Could not parse full data' };
      }
    }

    topicDetailsElement.innerHTML = `
      <h3>${topic.name || 'Unnamed Topic'}</h3>
      <div class="metadata">
        <p><strong>Forum:</strong> ${topic.forum_name || 'Unknown Forum'}</p>
        ${topic.created_at ? `<p><strong>Created:</strong> ${formatTime(topic.created_at)}</p>` : ''}
        ${topic.updated_at ? `<p><strong>Last Updated:</strong> ${formatTime(topic.updated_at)}</p>` : ''}
      </div>
      ${
        topic.base_metadata
          ? `
        <div class="base-metadata">
          <h4>Overview</h4>
          <p>${topic.base_metadata}</p>
        </div>
      `
          : ''
      }
      ${
        fullData.description
          ? `
        <div class="full-data">
          <h4>Full Description</h4>
          <p>${fullData.description}</p>
        </div>
      `
          : ''
      }
      ${
        topic.context
          ? `
        <div class="context">
          <h4>Context</h4>
          <div class="context-content">${topic.context}</div>
        </div>
      `
          : ''
      }
      ${
        topic.citations
          ? `
        <div class="citations">
          <h4>Citations</h4>
          ${formatCitations(topic.citations)}
        </div>
      `
          : ''
      }
    `;

    topicsList.style.display = 'none';
    topicDetails.style.display = 'block';
  };

  const formatCitations = citations => {
    if (!citations) {
      return '<p>No citations available</p>';
    }

    // If citations is a string, try to parse it as JSON
    let citationArray = citations;
    if (typeof citations === 'string') {
      try {
        citationArray = JSON.parse(citations);
      } catch {
        // If parsing fails, treat it as a single citation
        citationArray = [citations];
      }
    }

    // If it's not an array, convert it to one
    if (!Array.isArray(citationArray)) {
      citationArray = [citationArray];
    }

    if (citationArray.length === 0) {
      return '<p>No citations available</p>';
    }

    return citationArray
      .map(
        citation => `
      <div class="citation">
        <p>${typeof citation === 'string' ? citation : JSON.stringify(citation)}</p>
      </div>
    `
      )
      .join('');
  };

  // Event Listeners for Common Topics
  refreshTopicsButton?.addEventListener('click', () => {
    console.log('Refresh topics button clicked');
    refreshTopics();
  });

  backToTopicsButton?.addEventListener('click', () => {
    console.log('Back to topics button clicked');
    const topicsList = document.querySelector('.topics-list');
    const topicDetails = document.querySelector('.topic-details');
    topicsList.style.display = 'block';
    topicDetails.style.display = 'none';
  });

  // Initialize topics on tab switch
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.tab === 'topics') {
        console.log('Topics tab selected, refreshing topics');
        refreshTopics();
      }
    });
  });

  // Add CSS styles
  const style = document.createElement('style');
  style.textContent = `
    .topics-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .topic-item {
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 5px;
      margin-bottom: 10px;
    }
    
    .topic-metadata {
      color: #666;
      font-size: 0.9em;
      margin: 5px 0;
    }
    
    .citation {
      padding: 10px;
      border-left: 3px solid #007bff;
      margin: 10px 0;
      background: #f8f9fa;
    }
    
    .metadata {
      margin-bottom: 20px;
    }
    
    pre {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
      overflow-x: auto;
    }
  `;
  document.head.appendChild(style);
});
