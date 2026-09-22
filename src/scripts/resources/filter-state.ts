export interface FilterState { tags: string[]; sd: boolean; hd: boolean; author: string }
export interface CardFacts { tags: string[]; authors: string[]; sd: boolean; hd: boolean }

export const emptyFilters: FilterState = { tags: [], sd: false, hd: false, author: '' };

export function parseFilters(search: string): FilterState {
  const params = new URLSearchParams(search);
  return {
    tags: [...new Set(params.getAll('tag').map((tag) => tag.trim().toLowerCase()).filter(Boolean))].sort(),
    sd: params.get('sd') === '1',
    hd: params.get('hd') === '1',
    author: (params.get('author') ?? '').trim(),
  };
}

/** A query string ("" when no filters are set) with a stable parameter order. */
export function serializeFilters(state: FilterState): string {
  const params = new URLSearchParams();
  for (const tag of [...state.tags].sort()) params.append('tag', tag);
  if (state.sd) params.set('sd', '1');
  if (state.hd) params.set('hd', '1');
  if (state.author) params.set('author', state.author);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function matchesFilters(card: CardFacts, state: FilterState): boolean {
  if ((state.sd && !card.sd) || (state.hd && !card.hd)) return false;
  if (!state.tags.every((tag) => card.tags.includes(tag))) return false;
  const author = state.author.toLowerCase();
  return !author || card.authors.some((name) => name.toLowerCase().includes(author));
}
