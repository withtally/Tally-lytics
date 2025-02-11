# Database

This directory contains database-related files for the Discourse Demo project.

## Structure

- `db.ts`: Initializes the database connection using Knex.js
- `migrations/`: Contains database migration files
- `models/`: Contains model files for database entities

## Migrations

The `migrations` directory contains numbered migration files that define the database schema. To run migrations:

```
npx knex migrate:latest
```

## Models

The `models` directory contains files that define the structure and methods for interacting with database entities. Key models include:

- `posts.ts`: Post-related database operations
- `topics.ts`: Topic-related database operations
- `users.ts`: User-related database operations
- `postEvaluations.ts`: Post evaluation database operations
- `topicEvaluations.ts`: Topic evaluation database operations

## Usage

Database operations should be performed using the models to ensure consistency and maintainability. The `db.ts` file exports a configured Knex instance that can be imported and used throughout the application for custom queries.