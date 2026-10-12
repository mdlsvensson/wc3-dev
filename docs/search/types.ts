export interface SearchEntry {
  id: string;
  url: string;
  title: string;
  heading: string;
  excerpt: string;
}
export interface SearchPayload {
  index: string;
  entries: readonly SearchEntry[];
}
export interface SearchEngine {
  search(query: string): readonly SearchEntry[];
}
