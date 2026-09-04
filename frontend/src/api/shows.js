import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

export const useShows = () => useQuery({ queryKey: ['shows'], queryFn: async () => (await api.get('/shows')).data });

export const useShow = (id) =>
  useQuery({ queryKey: ['show', id], queryFn: async () => (await api.get(`/shows/${id}`)).data, enabled: !!id });

export const useShowSeasons = (id) =>
  useQuery({
    queryKey: ['show', id, 'seasons'],
    queryFn: async () => (await api.get(`/shows/${id}/seasons`)).data,
    enabled: !!id,
  });

export const fetchEpisodePlayback = (id, profileId) =>
  api.get(`/episodes/${id}/playback`, { params: { profileId } }).then((r) => r.data);
