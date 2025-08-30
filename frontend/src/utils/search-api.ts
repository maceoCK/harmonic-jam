import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export interface SearchResult {
  companies: any[];
  total: number;
  aggregations: {
    industries?: { buckets: Array<{ key: string; doc_count: number }> };
    stages?: { buckets: Array<{ key: string; doc_count: number }> };
  };
}

export interface SuggestResult {
  suggestions: string[];
}

/**
 * Search companies using natural language queries
 */
export async function searchCompanies(
  query: string,
  offset: number = 0,
  limit: number = 25,
  collectionId?: string
): Promise<SearchResult> {
  const response = await axios.get(`${API_BASE_URL}/search`, {
    params: {
      q: query,
      offset,
      limit,
      collection_id: collectionId,
    },
  });
  return response.data;
}

/**
 * Get autocomplete suggestions
 */
export async function getSuggestions(query: string, size: number = 5): Promise<SuggestResult> {
  const response = await axios.get(`${API_BASE_URL}/search/suggest`, {
    params: {
      q: query,
      size,
    },
  });
  return response.data;
}

/**
 * Trigger reindexing of all companies
 */
export async function reindexCompanies(): Promise<void> {
  await axios.post(`${API_BASE_URL}/search/reindex`);
}