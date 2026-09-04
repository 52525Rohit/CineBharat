import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export const useTrendingMovies = () =>
  useQuery({ queryKey: ['movies', 'trending'], queryFn: async () => (await api.get('/movies/trending')).data });

export const usePopularMovies = () =>
  useQuery({ queryKey: ['movies', 'popular'], queryFn: async () => (await api.get('/movies/popular')).data });

export const useMovies = (params = {}) =>
  useQuery({
    queryKey: ['movies', params],
    queryFn: async () => (await api.get('/movies', { params })).data,
  });

export const useMovie = (id) =>
  useQuery({
    queryKey: ['movie', id],
    queryFn: async () => (await api.get(`/movies/${id}`)).data,
    enabled: !!id,
  });

export const fetchPlayback = (id, profileId) =>
  api.get(`/movies/${id}/playback`, { params: { profileId } }).then((r) => r.data);
