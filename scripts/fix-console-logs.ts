#!/usr/bin/env bun
/**
 * Script to systematically replace console.log statements with proper logger usage
 */

import { glob } from 'glob';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

interface LogReplacement {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const replacements: LogReplacement[] = [
  {
    pattern: /console\.log\(/g,
    replacement: 'logger.info(',
    description: 'Replace console.log with logger.info',
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'logger.error(',
    description: 'Replace console.error with logger.error',
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'logger.warn(',
    description: 'Replace console.warn with logger.warn',
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'logger.debug(',
    description: 'Replace console.debug with logger.debug',
  },
];

const filesToProcess = [
  'services/**/*.ts',
  'db/**/*.ts',
  'config/**/*.ts',
  'utils/**/*.ts',
  'admin/*.ts',
  'scripts/*.ts',
];

// Files to skip (already have proper logging or are external)
const skipPatterns = [
  /node_modules/,
  /\.next/,
  /migrations/,
  /fix-console-logs\.ts$/, // Skip this script itself
  /frontend/,
];

async function fixConsoleLogsInFile(filePath: string): Promise<boolean> {
  try {
    const content = readFileSync(filePath, 'utf8');
    let modifiedContent = content;
    let hasChanges = false;

    // Check if file already imports Logger
    const hasLoggerImport = /import.*Logger.*from/.test(content);

    // Apply replacements
    for (const { pattern, replacement } of replacements) {
      if (pattern.test(modifiedContent)) {
        modifiedContent = modifiedContent.replace(pattern, replacement);
        hasChanges = true;
      }
    }

    if (hasChanges && !hasLoggerImport) {
      // Add logger import at the top of the file
      const logFilename = path.basename(filePath, '.ts');
      const loggerImport = `import { Logger } from '../logging';\n\nconst logger = new Logger({ logFile: 'logs/${logFilename}.log' });\n\n`;

      // Find the last import statement
      const importRegex = /^import.*from.*['"];?$/gm;
      const imports = modifiedContent.match(importRegex);

      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        const lastImportIndex = modifiedContent.lastIndexOf(lastImport);
        const insertIndex = lastImportIndex + lastImport.length + 1;

        modifiedContent =
          modifiedContent.slice(0, insertIndex) +
          '\n' +
          loggerImport +
          modifiedContent.slice(insertIndex);
      } else {
        // No imports found, add at the beginning
        modifiedContent = loggerImport + modifiedContent;
      }
    }

    if (hasChanges) {
      writeFileSync(filePath, modifiedContent, 'utf8');
      console.log(`✅ Fixed console statements in: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  console.log('🔧 Starting console.log replacement...\n');

  let totalFiles = 0;
  let modifiedFiles = 0;

  for (const pattern of filesToProcess) {
    const files = await glob(pattern);

    for (const file of files) {
      // Skip files matching skip patterns
      if (skipPatterns.some(skipPattern => skipPattern.test(file))) {
        continue;
      }

      totalFiles++;
      const wasModified = await fixConsoleLogsInFile(file);
      if (wasModified) {
        modifiedFiles++;
      }
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Total files processed: ${totalFiles}`);
  console.log(`   Files modified: ${modifiedFiles}`);
  console.log(`   Files unchanged: ${totalFiles - modifiedFiles}`);

  if (modifiedFiles > 0) {
    console.log(`\n✨ Next steps:`);
    console.log(`   1. Review the changes: git diff`);
    console.log(`   2. Test the application: bun start`);
    console.log(
      `   3. Commit the changes: git add . && git commit -m "Replace console statements with proper logging"`
    );
  } else {
    console.log(`\n✅ No console statements found to replace!`);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}

export { fixConsoleLogsInFile };
