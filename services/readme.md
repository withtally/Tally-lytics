# Services

This directory contains the core functionality of the Discourse Demo project.

## Structure

- `api.ts`: API service for interacting with the Discourse forum
- `crawler/`: Discourse forum crawler implementation
- `snapshot/`: Snapshot proposal crawler implementation
- `tally/`: Tally governance proposal crawler implementation
- `llm/`: AI-powered analysis services
- `logging/`: Custom logging implementation

## Key Components

### Crawlers

- `crawler/index.ts`: Main Discourse crawler implementation
- `snapshot/index.ts`: Snapshot proposal crawler
- `tally/index.ts`: Tally governance proposal crawler

### AI Services

- `llm/postEvaluation.ts`: Evaluates post quality using AI
- `llm/topicEvaluation.ts`: Evaluates and summarizes topics using AI
- `llm/embeddings/`: Generates and manages vector embeddings for search

### Database Services

- `crawler/databaseService.ts`: Handles database operations for crawled data

### Logging

- `logging/index.ts`: Exports a custom Logger class and utility functions

## Usage

These services are orchestrated by the main application file (`app.ts`) to perform the complete crawling, analysis, and storage process for forum data.