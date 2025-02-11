# Utilities

This directory contains utility functions used throughout the Discourse Demo project.

## Files

### `dbUtils.ts`

Provides utility functions for database operations, including:

- `getLastCrawlTime`: Retrieves the timestamp of the last crawl for a specific forum
- `updateCrawlTime`: Updates the timestamp of the last crawl for a specific forum

### `numberUtils.ts`

Contains utility functions for number handling, including:

- `roundNumericFields`: Rounds numeric fields in an object

### `tokenizer.ts`

Provides utilities for text tokenization, including:

- `estimateTokens`: Estimates the number of tokens in a given text

## Usage

These utility functions are imported and used throughout the application to perform common operations and maintain consistency in data handling.