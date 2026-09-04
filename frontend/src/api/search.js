import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export const useSearch = (q) =>
  useQuery({
    queryKey: ['search', q],
    queryFn: async () => (await api.get('/search', { params: { q } })).data,
    enabled: q.trim().length > 0,
  });
