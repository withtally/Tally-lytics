# Simplified Tally-lytics Implementation Blueprint

## New Project Structure
```
tally-lytics-simple/
├── backend/
│   ├── server.ts           # ~500 lines - All routes & server setup
│   ├── db.ts               # ~300 lines - Database queries & connection
│   ├── crawler.ts          # ~400 lines - Unified crawler with adapters
│   ├── llm.ts              # ~200 lines - OpenAI integration
│   └── config.ts           # ~50 lines - Environment & settings
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx        # ~200 lines - Search interface
│   │   ├── admin/
│   │   │   └── page.tsx    # ~300 lines - Admin dashboard
│   │   └── layout.tsx      # ~50 lines - App layout
│   ├── components/
│   │   ├── SearchBar.tsx   # ~100 lines
│   │   ├── ResultCard.tsx  # ~80 lines
│   │   └── CrawlStatus.tsx # ~150 lines
│   └── lib/
│       └── api.ts          # ~100 lines - API client
│
├── migrations/
│   └── 001_initial.sql     # Complete schema
│
├── docker-compose.yml       # PostgreSQL + pgvector
├── package.json            # Minimal dependencies
├── .env.example
└── README.md
```

## Core Implementation Details

### 1. **server.ts** - Complete Backend in One File
```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import * as db from './db'
import { UnifiedCrawler } from './crawler'
import { LLMService } from './llm'
import { config } from './config'

const app = new Hono()
const crawler = new UnifiedCrawler()
const llm = new LLMService()

app.use('*', cors())

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }))

// Start crawl
app.post('/crawl/:source', async (c) => {
  const { source } = c.req.param()
  const result = await crawler.crawl(source)
  return c.json(result)
})

// Search with vectors
app.get('/search', async (c) => {
  const { q, source, limit = 20 } = c.req.query()
  
  // Generate embedding for query
  const embedding = await llm.generateEmbedding(q)
  
  // Vector similarity search
  const results = await db.vectorSearch(embedding, {
    source,
    limit: parseInt(limit)
  })
  
  return c.json(results)
})

// Get content by ID
app.get('/content/:id', async (c) => {
  const { id } = c.req.param()
  const content = await db.getContent(id)
  const evaluation = await db.getEvaluation(id)
  return c.json({ content, evaluation })
})

// Analytics endpoint
app.get('/analytics', async (c) => {
  const stats = await db.getAnalytics()
  return c.json(stats)
})

// System status
app.get('/status', async (c) => {
  const crawlStatus = crawler.getStatus()
  const dbStats = await db.getStats()
  return c.json({ crawlStatus, dbStats })
})

export default app
```

### 2. **db.ts** - All Database Operations
```typescript
import { Pool } from 'pg'
import pgvector from 'pgvector/pg'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

// Register pgvector type
pgvector.registerType(pool)

export async function saveContent(content: any) {
  const { rows } = await pool.query(`
    INSERT INTO content (type, source, external_id, author, title, body, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (source, external_id) 
    DO UPDATE SET body = $6, metadata = $7
    RETURNING id
  `, [content.type, content.source, content.external_id, 
      content.author, content.title, content.body, content.metadata])
  return rows[0].id
}

export async function saveVector(contentId: number, embedding: number[]) {
  await pool.query(`
    INSERT INTO vectors (content_id, embedding)
    VALUES ($1, $2)
    ON CONFLICT (content_id) 
    DO UPDATE SET embedding = $2
  `, [contentId, pgvector.toSql(embedding)])
}

export async function vectorSearch(embedding: number[], filters: any) {
  const { rows } = await pool.query(`
    SELECT 
      c.*,
      v.embedding <=> $1 as distance,
      e.result as evaluation
    FROM vectors v
    JOIN content c ON v.content_id = c.id
    LEFT JOIN evaluations e ON c.id = e.content_id
    WHERE ($2::text IS NULL OR c.source = $2)
    ORDER BY v.embedding <=> $1
    LIMIT $3
  `, [pgvector.toSql(embedding), filters.source, filters.limit])
  return rows
}

export async function getAnalytics() {
  const { rows } = await pool.query(`
    SELECT 
      source,
      type,
      COUNT(*) as count,
      MAX(created_at) as last_updated
    FROM content
    GROUP BY source, type
  `)
  return rows
}
```

### 3. **crawler.ts** - Unified Crawler
```typescript
import * as db from './db'
import { LLMService } from './llm'

interface CrawlerAdapter {
  name: string
  fetchLatest(since?: Date): Promise<any[]>
}

class DiscourseAdapter implements CrawlerAdapter {
  name = 'discourse'
  
  async fetchLatest(since?: Date) {
    const response = await fetch(`${process.env.DISCOURSE_URL}/latest.json`)
    const data = await response.json()
    return data.topic_list.topics.map(t => ({
      type: 'topic',
      source: this.name,
      external_id: t.id.toString(),
      author: t.posters?.[0]?.user_id,
      title: t.title,
      body: t.excerpt || '',
      metadata: { 
        views: t.views, 
        posts_count: t.posts_count,
        created_at: t.created_at 
      }
    }))
  }
}

class TallyAdapter implements CrawlerAdapter {
  name = 'tally'
  
  async fetchLatest() {
    const query = `
      query {
        proposals(first: 20, orderBy: createdAt, orderDirection: desc) {
          id
          title  
          description
          proposer { id }
          createdAt
        }
      }
    `
    const response = await fetch('https://api.tally.xyz/query', {
      method: 'POST',
      headers: { 
        'Api-Key': process.env.TALLY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    })
    
    const { data } = await response.json()
    return data.proposals.map(p => ({
      type: 'proposal',
      source: this.name,
      external_id: p.id,
      author: p.proposer.id,
      title: p.title,
      body: p.description,
      metadata: { created_at: p.createdAt }
    }))
  }
}

export class UnifiedCrawler {
  private adapters = new Map<string, CrawlerAdapter>([
    ['discourse', new DiscourseAdapter()],
    ['tally', new TallyAdapter()],
  ])
  
  private llm = new LLMService()
  private status = new Map<string, any>()
  
  async crawl(source: string) {
    const adapter = this.adapters.get(source)
    if (!adapter) throw new Error(`Unknown source: ${source}`)
    
    this.status.set(source, { status: 'running', startTime: new Date() })
    
    try {
      // Fetch content
      const items = await adapter.fetchLatest()
      
      // Save and process each item
      for (const item of items) {
        const contentId = await db.saveContent(item)
        
        // Generate embedding
        const text = `${item.title} ${item.body}`.slice(0, 8000)
        const embedding = await this.llm.generateEmbedding(text)
        await db.saveVector(contentId, embedding)
        
        // Evaluate content
        const evaluation = await this.llm.evaluate(item)
        await db.saveEvaluation(contentId, evaluation)
      }
      
      this.status.set(source, { 
        status: 'completed', 
        itemsProcessed: items.length,
        endTime: new Date() 
      })
      
      return { success: true, processed: items.length }
    } catch (error) {
      this.status.set(source, { status: 'failed', error: error.message })
      throw error
    }
  }
  
  getStatus() {
    return Object.fromEntries(this.status)
  }
}
```

### 4. **llm.ts** - Simplified LLM Service
```typescript
import OpenAI from 'openai'

export class LLMService {
  private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.slice(0, 8191),
      dimensions: 1536
    })
    return response.data[0].embedding
  }
  
  async evaluate(content: any): Promise<any> {
    const prompt = `
      Evaluate this ${content.type} on a scale of 1-10 for:
      - Quality
      - Relevance  
      - Clarity
      
      Content: ${content.title}
      ${content.body?.slice(0, 2000)}
      
      Return JSON only.
    `
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    })
    
    return JSON.parse(response.choices[0].message.content)
  }
  
  async summarize(text: string): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'Summarize the following text in 2-3 sentences.' },
        { role: 'user', content: text.slice(0, 4000) }
      ],
      max_tokens: 150
    })
    
    return response.choices[0].message.content
  }
}
```

### 5. **Frontend Search Page** (app/page.tsx)
```tsx
'use client'
import { useState } from 'react'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  
  async function search() {
    setLoading(true)
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
    const data = await res.json()
    setResults(data)
    setLoading(false)
  }
  
  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">DAO Governance Search</h1>
      
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder="Search governance discussions..."
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <button
          onClick={search}
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>
      
      <div className="space-y-4">
        {results.map((result) => (
          <div key={result.id} className="p-4 border rounded-lg">
            <h3 className="font-semibold text-lg">{result.title}</h3>
            <p className="text-gray-600 mt-2">{result.body?.slice(0, 200)}...</p>
            <div className="flex gap-4 mt-3 text-sm text-gray-500">
              <span>Source: {result.source}</span>
              <span>Score: {result.evaluation?.quality || 'N/A'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 6. **Admin Dashboard** (app/admin/page.tsx)
```tsx
'use client'
import { useEffect, useState } from 'react'

export default function AdminDashboard() {
  const [status, setStatus] = useState({})
  const [analytics, setAnalytics] = useState([])
  
  useEffect(() => {
    fetchStatus()
    fetchAnalytics()
    const interval = setInterval(fetchStatus, 5000)
    return () => clearInterval(interval)
  }, [])
  
  async function fetchStatus() {
    const res = await fetch('/api/status')
    const data = await res.json()
    setStatus(data)
  }
  
  async function fetchAnalytics() {
    const res = await fetch('/api/analytics')
    const data = await res.json()
    setAnalytics(data)
  }
  
  async function startCrawl(source: string) {
    await fetch(`/api/crawl/${source}`, { method: 'POST' })
    fetchStatus()
  }
  
  return (
    <div className="max-w-6xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Crawl Controls */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {['discourse', 'tally', 'snapshot'].map(source => (
          <div key={source} className="p-4 border rounded-lg">
            <h3 className="font-semibold capitalize">{source}</h3>
            <div className="text-sm text-gray-600 my-2">
              Status: {status.crawlStatus?.[source]?.status || 'idle'}
            </div>
            <button
              onClick={() => startCrawl(source)}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Start Crawl
            </button>
          </div>
        ))}
      </div>
      
      {/* Analytics */}
      <div className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Content Statistics</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2">Source</th>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Count</th>
              <th className="text-left p-2">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {analytics.map((stat, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{stat.source}</td>
                <td className="p-2">{stat.type}</td>
                <td className="p-2">{stat.count}</td>
                <td className="p-2">{new Date(stat.last_updated).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

## Migration SQL
```sql
-- migrations/001_initial.sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE content (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  author TEXT,
  title TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source, external_id)
);

CREATE TABLE evaluations (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES content(id) ON DELETE CASCADE,
  evaluation_type TEXT DEFAULT 'quality',
  score DECIMAL,
  result JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_id, evaluation_type)
);

CREATE TABLE vectors (
  id SERIAL PRIMARY KEY,
  content_id INTEGER UNIQUE REFERENCES content(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE system (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_content_source ON content(source);
CREATE INDEX idx_content_type ON content(type);
CREATE INDEX idx_content_created ON content(created_at DESC);
CREATE INDEX idx_vectors_embedding ON vectors USING ivfflat (embedding vector_cosine_ops);
```

## Minimal package.json
```json
{
  "name": "tally-lytics-simple",
  "version": "2.0.0",
  "scripts": {
    "dev": "bun run --watch backend/server.ts",
    "build": "bun build backend/server.ts --outdir dist",
    "migrate": "psql $DATABASE_URL -f migrations/001_initial.sql"
  },
  "dependencies": {
    "hono": "^4.0.0",
    "pg": "^8.11.0",
    "pgvector": "^0.2.0",
    "openai": "^4.0.0"
  },
  "devDependencies": {
    "bun-types": "latest",
    "@types/pg": "^8.0.0"
  }
}
```

## Deployment (Railway)
```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "bun run backend/server.ts"

[[services]]
name = "web"
port = 3000

[cron]
"0 */6 * * *" = "curl -X POST https://$RAILWAY_PUBLIC_DOMAIN/crawl/discourse"
"0 */12 * * *" = "curl -X POST https://$RAILWAY_PUBLIC_DOMAIN/crawl/tally"
```

## Results
- **15 files total** vs 200+ files
- **~2000 lines of code** vs 15,000+ lines
- **Single deployment** vs complex multi-service
- **4 database tables** vs 20+ tables
- **6 API endpoints** vs 30+ endpoints
- **20 dependencies** vs 82 dependencies