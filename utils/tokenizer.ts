// utils/tokenizer.ts
export function estimateTokens(text: string): number {
  const words = text.split(/\s+/).length;
  // Approximate 1.5 tokens per word as a rough estimate
  return Math.ceil(words * 1.5);
}
