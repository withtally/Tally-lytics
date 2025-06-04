# Frontend Refactor Plan: Admin-Only Indexer Dashboard

## Current State Analysis

The frontend currently has many placeholder pages and features that aren't connected to the actual backend functionality. The API service (`services/api.ts`) has many endpoints defined that don't exist in the backend.

### Existing Pages (Mostly Placeholders):
- `/` - Home dashboard
- `/dashboard/analytics` - Analytics page
- `/data-collection/forums` - Forum crawler management
- `/data-collection/market` - Market data management
- `/data-collection/news` - News crawler management
- `/search` - Search interface
- `/search/assistant` - AI assistant
- `/search/topics` - Common topics
- `/system/health` - System health
- `/system/cron` - Cron job management
- `/system/logs-viewer` - Log viewer

### Backend Reality:
The actual backend provides:
- Forum crawling with real-time status
- Post/topic evaluation with LLM
- Vector embeddings generation
- Semantic search across content
- Common topics generation
- Basic health monitoring
- Cron job history tracking

## Refactor Plan

### Phase 1: Authentication & Security
1. **Add password protection for admin access**
   - Use NextAuth.js with credentials provider
   - Single admin password from environment variable
   - Protect all routes with middleware
   - Session management

### Phase 2: Core Dashboard Refactor
1. **Home Dashboard (`/`)**
   - Real-time crawler status for all forums
   - Recent indexing activity
   - System health overview
   - Quick actions (start/stop crawlers)

2. **Remove unnecessary pages:**
   - `/dashboard/analytics` - Not needed
   - `/data-collection/market` - Not implemented
   - `/data-collection/news` - Not implemented
   - `/search/assistant` - Not implemented

### Phase 3: Wire Up Actual Functionality

#### 3.1 Forum Crawler Management (`/crawlers`)
- **Features:**
  - List all configured forums with real-time status
  - Start/stop individual crawlers
  - View crawling progress (topics, posts, evaluations)
  - Last run time and error messages
  - Manual trigger for indexing
  
- **API Endpoints to use:**
  - `GET /api/crawl/status` - Get all crawler statuses
  - `POST /api/crawl/start/:forumName` - Start specific crawler
  - `POST /api/crawl/stop/:forumName` - Stop specific crawler

#### 3.2 Search Interface (`/search`)
- **Features:**
  - Universal search across all indexed content
  - Filter by forum, content type
  - Display search results with relevance scores
  - Show LLM evaluations and summaries
  
- **API Endpoints to use:**
  - `POST /api/searchAll` - Search across all content
  - `POST /api/searchByType` - Search specific content type

#### 3.3 Common Topics (`/topics`)
- **Features:**
  - View generated common topics
  - Filter by forum
  - Manual regeneration trigger
  - Topic relevance scores
  
- **API Endpoints to use:**
  - `GET /api/common-topics` - List all topics
  - `POST /api/common-topics/generate/:forum` - Generate for specific forum

#### 3.4 System Monitoring (`/system`)
- **Features:**
  - Health status display
  - Cron job history
  - Log viewer (if logs are accessible)
  - Database statistics
  
- **API Endpoints to use:**
  - `GET /health` - System health check
  - `GET /api/cron/job-history` - Cron execution history

### Phase 4: UI/UX Improvements

1. **Real-time Updates:**
   - WebSocket or polling for crawler status
   - Live progress bars for indexing
   - Toast notifications for actions

2. **Data Visualization:**
   - Charts for indexing progress over time
   - Topic distribution visualization
   - Search query analytics

3. **Responsive Design:**
   - Mobile-friendly admin interface
   - Collapsible sidebar for small screens

### Phase 5: Deployment Configuration

1. **Environment Variables:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   ADMIN_PASSWORD=secure-password
   NEXTAUTH_SECRET=random-secret
   NEXTAUTH_URL=https://your-frontend.railway.app
   ```

2. **Railway Configuration:**
   - Separate service for frontend
   - Environment variable management
   - Health checks for both services

## Implementation Priority

1. **High Priority (MVP):**
   - Authentication/password protection
   - Crawler status and control
   - Basic search functionality
   - System health monitoring

2. **Medium Priority:**
   - Common topics viewer
   - Cron job history
   - Better error handling
   - Loading states

3. **Low Priority:**
   - Advanced visualizations
   - Export functionality
   - Detailed analytics

## Technical Decisions

1. **State Management:** Use React Query for server state
2. **Authentication:** NextAuth.js with credentials provider
3. **UI Components:** Continue with existing shadcn/ui components
4. **API Communication:** Existing axios setup with proper error handling
5. **Real-time Updates:** Start with polling, consider WebSockets later

## File Structure After Refactor

```
app/
├── (auth)/
│   └── login/
│       └── page.tsx          # Login page
├── (protected)/
│   ├── layout.tsx           # Protected layout with auth check
│   ├── page.tsx             # Dashboard home
│   ├── crawlers/
│   │   └── page.tsx         # Crawler management
│   ├── search/
│   │   └── page.tsx         # Search interface
│   ├── topics/
│   │   └── page.tsx         # Common topics
│   └── system/
│       ├── page.tsx         # System overview
│       ├── health/
│       │   └── page.tsx     # Health status
│       └── jobs/
│           └── page.tsx     # Cron job history
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts     # NextAuth API route
└── middleware.ts            # Auth middleware
```

## Next Steps

1. Set up authentication with NextAuth.js
2. Create protected layout wrapper
3. Refactor home dashboard to show real crawler status
4. Connect crawler management page to backend
5. Implement search functionality
6. Add system monitoring features
7. Deploy to Railway with proper environment configuration