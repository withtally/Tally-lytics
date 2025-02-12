# Product Requirements Document: URL Parameter Support for API Endpoints

## Overview
This PRD outlines the requirements for implementing URL parameter support for the DAO Helper Tool's API endpoints. This feature will enable users to share search results and specific views through URLs, enhancing the tool's usability and shareability.

## Problem Statement
Currently, all API interactions require POST requests with JSON bodies. This makes it impossible to:
- Share specific search results via URL
- Bookmark specific searches or views
- Access API endpoints directly through the browser
- Create direct links to specific content

## Goals
1. Enable GET request support for all read operations
2. Make all search functionality accessible via URL parameters
3. Maintain backward compatibility with existing POST endpoints
4. Implement proper parameter validation and sanitization
5. Provide clear documentation for URL parameter usage

## Non-Goals
1. Converting write/mutation operations to GET requests
2. Changing the existing POST endpoint behavior
3. Implementing new search features
4. Modifying the underlying search logic

## Requirements

### Technical Requirements

#### 1. URL Parameter Support
- Convert all read operations to support GET requests with URL parameters
- Maintain identical functionality between POST and GET methods
- Implement proper URL encoding/decoding for special characters
- Support all existing search parameters:
  - query
  - type
  - forum
  - limit
  - threshold
  - boostRecent
  - boostPopular
  - useCache

#### 2. Endpoint Modifications
```typescript
// Current POST endpoint:
POST /api/searchByType
{
  "query": "string",
  "type": "topic" | "post" | "snapshot" | "tally",
  "forum": "string",
  "limit": number,
  "threshold": number,
  "boostRecent": boolean,
  "boostPopular": boolean,
  "useCache": boolean
}

// New GET endpoint:
GET /api/search?q=string&type=topic&forum=string&limit=10&threshold=0.5&boost=recent,popular&cache=true
```

#### 3. Parameter Specifications
- `q`: Search query string (URL encoded)
- `type`: One of ["topic", "post", "snapshot", "tally"]
- `forum`: Forum identifier string
- `limit`: Number (default: 10)
- `threshold`: Number between 0 and 1 (default: 0.5)
- `boost`: Comma-separated list of boost options ["recent", "popular"]
- `cache`: Boolean (default: true)

#### 4. Error Handling
- Clear error messages for invalid parameters
- Proper HTTP status codes for different error cases
- Graceful fallback to default values when appropriate

### Security Requirements
1. Input Validation
   - Sanitize all URL parameters
   - Validate parameter types and ranges
   - Prevent SQL injection and other security vulnerabilities

2. Rate Limiting
   - Apply the same rate limits as POST endpoints
   - Implement caching for identical GET requests

### Documentation Requirements
1. API Documentation
   - Clear examples of URL parameter usage
   - Parameter descriptions and valid values
   - Error message documentation
   - Migration guide for existing users

2. OpenAPI/Swagger Updates
   - Add GET endpoint specifications
   - Document all parameters
   - Provide example URLs

## User Experience

### Example Use Cases
1. Sharing Search Results:
```
https://api.example.com/search?q=treasury+management&type=topic&forum=ARBITRUM
```

2. Bookmarking Common Searches:
```
https://api.example.com/search?q=governance&type=post&forum=UNISWAP&boost=recent
```

3. Direct Browser Access:
```
https://api.example.com/search?q=proposals&forum=ENS&limit=20
```

## Implementation Phases

### Phase 1: Core Implementation
1. Add GET endpoint support
2. Implement parameter parsing
3. Add basic validation
4. Update error handling

### Phase 2: Enhancement
1. Add parameter normalization
2. Implement caching
3. Add rate limiting
4. Create basic documentation

### Phase 3: Finalization
1. Complete API documentation
2. Add OpenAPI/Swagger support
3. Create usage examples
4. Perform security audit

## Success Metrics
1. Adoption rate of GET endpoints vs POST endpoints
2. Number of shared/bookmarked URLs
3. Error rate comparison between GET and POST endpoints
4. API response time comparison
5. User feedback and satisfaction

## Testing Requirements
1. Unit Tests
   - Parameter parsing
   - Validation logic
   - Error handling
   - Type conversion

2. Integration Tests
   - End-to-end API calls
   - Error scenarios
   - Rate limiting
   - Caching behavior

3. Security Tests
   - Input sanitization
   - SQL injection prevention
   - Parameter manipulation attempts

## Dependencies
1. URL parsing library
2. Parameter validation library
3. Updated API documentation tools
4. OpenAPI/Swagger updates

## Timeline
- Phase 1: 1 week
- Phase 2: 1 week
- Phase 3: 1 week
- Testing: 1 week
- Documentation: 3 days
- Total: 4 weeks

## Future Considerations
1. GraphQL implementation
2. Advanced parameter combinations
3. Custom parameter formats
4. Analytics for URL parameter usage
5. Automated testing for all parameter combinations

## Risks and Mitigations
1. Risk: Performance impact of parameter parsing
   Mitigation: Implement efficient parsing and caching

2. Risk: Security vulnerabilities from URL parameters
   Mitigation: Thorough security audit and input sanitization

3. Risk: Confusion between POST and GET endpoints
   Mitigation: Clear documentation and migration guides

4. Risk: URL length limitations
   Mitigation: Implement compression for long queries

## Appendix

### Example Implementations

#### Parameter Parsing
```typescript
interface SearchParams {
  q: string;
  type?: 'topic' | 'post' | 'snapshot' | 'tally';
  forum: string;
  limit?: number;
  threshold?: number;
  boost?: string[];
  cache?: boolean;
}
```

#### Error Response Format
```typescript
interface ErrorResponse {
  error: string;
  code: string;
  details?: {
    parameter?: string;
    message?: string;
    validValues?: string[];
  };
}
```

### Migration Guide
1. Update API client to support both GET and POST
2. Test with existing queries
3. Update documentation references
4. Monitor error rates during transition 