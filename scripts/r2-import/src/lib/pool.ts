// Bounded promise concurrency. Runs items through `worker` with at most `limit`
// in-flight. Rejects on first error after all in-flight have settled.

export async function runPool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let firstError: unknown = null;

  const consumer = async () => {
    while (firstError === null) {
      const idx = nextIndex++;
      if (idx >= items.length) return;
      try {
        results[idx] = await worker(items[idx], idx);
      } catch (err) {
        if (firstError === null) firstError = err;
        return;
      }
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, consumer);
  await Promise.all(workers);
  if (firstError !== null) throw firstError;
  return results;
}
