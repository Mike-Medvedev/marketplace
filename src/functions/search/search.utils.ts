/** Delays for a variable duration with optional jitter. */
export function delay(ms: number, jitterPercent = 20): Promise<void> {
  const jitter = (ms * jitterPercent) / 100;
  const min = ms - jitter;
  const max = ms + jitter;
  const actualMs = Math.max(0, min + Math.random() * (max - min));
  return new Promise((resolve) => setTimeout(resolve, actualMs));
}
