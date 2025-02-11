/* eslint-env node */
/* global module */

module.exports = {
  env: {
    node: true,
    es6: true,
    commonjs: true,
  },
  globals: {
    module: true,
    require: true,
    exports: true,
    process: true,
    console: true,
    __dirname: true,
    Buffer: true,
  },
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignorePatterns: ['db/migrations/*.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'no-case-declarations': 'off',
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-inner-declarations': 'off',
    '@typescript-eslint/no-require-imports': 'off',
  },
  overrides: [
    {
      files: ['*.cjs', '*.js', '.eslintrc.cjs', 'eslint.config.cjs'],
      env: {
        node: true,
        commonjs: true,
      },
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        'no-undef': 'off',
        '@typescript-eslint/no-require-imports': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern:
              '^(_|knex|config|DbConfig|Topic|User|ForumConfig|ServerWebSocket|ProcessedProposal|Proposal|ProposalsResponse|pgVectorClient|roundNumericFields|checkTokenLimit|truncateToTokenLimit|evaluatePost|vectorizeContent|vectorizeEvaluation|insertTopicEvaluation|requestWithRetry|onProgress|truncateMarketDataTables|FINAL_STATES|ProposalNode|url|error|obj|batches|retries)$',
            caughtErrorsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
          },
        ],
      },
    },
  ],
};
