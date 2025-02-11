# Configuration

This directory contains configuration files for the Discourse Demo project.

## Files

### `forumConfig.ts`

This file exports an array of `ForumConfig` objects, each representing a forum to be crawled. It includes:

- Forum name
- API configuration (API key, username, and URL)
- Optional Snapshot space ID
- Optional Tally configuration

To add a new forum, append a new object to the `forumConfigs` array.

### `loggerConfig.ts`

This file exports a `LoggingConfig` object that sets up the logging configuration for the project. It includes:

- Log level
- Log file path

Adjust these settings to change the logging behavior of the application.

## Usage

These configuration files are imported and used throughout the application to provide consistent settings for forum crawling and logging.