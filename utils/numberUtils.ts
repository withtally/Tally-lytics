export function roundNumericFields<T>(obj: T): T {
  const result = { ...obj };
  for (const key in result) {
    if (typeof result[key] === 'number') {
      result[key] = Math.round(result[key] as number) as any;
    }
  }
  return result;
}
