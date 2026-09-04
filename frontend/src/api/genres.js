import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export const useGenres = () => useQuery({ queryKey: ['genres'], queryFn: async () => (await api.get('/genres')).data });
