#!/usr/bin/env bun

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const migrationPath = path.join(__dirname, '../db/migrations/20241023202406_uniformTables.cjs');

console.log('🔧 Temporarily modifying migration to skip pgvector...');

// Read the original migration
const originalContent = fs.readFileSync(migrationPath, 'utf8');

// Create a backup
fs.writeFileSync(migrationPath + '.backup', originalContent);

// Modify the migration to comment out vector-related parts
let modifiedContent = originalContent
  // Comment out the CREATE EXTENSION line
  .replace(
    ".raw('CREATE EXTENSION IF NOT EXISTS vector;')",
    "// .raw('CREATE EXTENSION IF NOT EXISTS vector;') // Skipped for Railway"
  )
  // Comment out all vector table creations
  .replace(
    /\.createTable\('(topic_vectors|post_vectors|topic_evaluation_vectors|post_evaluation_vectors|snapshot_proposal_vectors|tally_proposal_vectors)'[\s\S]*?\}\)/g,
    (match) => `/* Skipped vector table:\n${match}\n*/`
  )
  // Comment out the foreign key constraints for vector tables
  .replace(
    /ALTER TABLE (topic_vectors|post_vectors|topic_evaluation_vectors|post_evaluation_vectors|snapshot_proposal_vectors|tally_proposal_vectors)[\s\S]*?ON DELETE CASCADE;/g,
    (match) => `-- Skipped: ${match}`
  );

// Write the modified migration
fs.writeFileSync(migrationPath, modifiedContent);

console.log('✅ Migration modified');
console.log('🚀 Running migration...');

try {
  // Run the migration
  execSync('bun knex migrate:latest --env production', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error);
} finally {
  // Restore the original migration
  console.log('🔧 Restoring original migration file...');
  fs.writeFileSync(migrationPath, originalContent);
  fs.unlinkSync(migrationPath + '.backup');
  console.log('✅ Original migration restored');
}