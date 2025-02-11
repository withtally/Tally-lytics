import 'dotenv/config';
import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// console.log('API', OPENAI_API_KEY);
const OPENAI_ORG_ID = process.env.OPENAI_ORG_ID;
// console.log('ORG', OPENAI_ORG_ID);

if (!OPENAI_API_KEY || !OPENAI_ORG_ID) {
  console.error('Missing OpenAI credentials in environment variables');
  process.exit(1);
}

export const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
  organization: OPENAI_ORG_ID,
});

export const model = process.env.LLM_MODEL || 'gpt-4-1106-preview';
export const miniModel = process.env.LLM_MINI_MODEL || 'gpt-3.5-turbo';
