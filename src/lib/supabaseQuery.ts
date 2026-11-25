// Supabase returns at most 1000 rows per request
const PAGE_SIZE = 1000;
// Pages fetched at once when a query spans several pages
const PARALLEL_PAGES = 5;
// Long .in() lists overflow the request URL (Bad Request), so IDs are sent in batches
const IN_CHUNK_SIZE = 100;

type RangeQuery = {
  range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
};

type InQuery = PromiseLike<{ data: unknown[] | null; error: unknown }>;

/**
 * Fetches every row of a query, several pages at a time. `query` must build a
 * fresh query each call and have a stable order.
 */
export async function selectAll<T>(query: () => RangeQuery): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE * PARALLEL_PAGES) {
    const pages = await Promise.all(
      Array.from({ length: PARALLEL_PAGES }, (_, i) => {
        const pageFrom = from + i * PAGE_SIZE;
        return query().range(pageFrom, pageFrom + PAGE_SIZE - 1);
      })
    );
    for (const { data, error } of pages) {
      if (error) throw error;
      rows.push(...((data || []) as T[]));
      if (!data || data.length < PAGE_SIZE) return rows;
    }
  }
}

/** Runs `query` for batches of IDs in parallel and concatenates the rows. */
export async function selectByIds<T>(ids: string[], query: (ids: string[]) => InQuery): Promise<T[]> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  const batches: string[][] = [];
  for (let i = 0; i < unique.length; i += IN_CHUNK_SIZE) {
    batches.push(unique.slice(i, i + IN_CHUNK_SIZE));
  }
  const results = await Promise.all(batches.map(batch => query(batch)));
  return results.flatMap(({ data, error }) => {
    if (error) throw error;
    return (data || []) as T[];
  });
}
