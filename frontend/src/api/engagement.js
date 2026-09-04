import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { api } from '../lib/api.js';

function useActiveProfileId() {
  return useSelector((s) => s.auth.activeProfileId);
}

export const useWatchlist = () => {
  const profileId = useActiveProfileId();
  return useQuery({
    queryKey: ['watchlist', profileId],
    queryFn: async () => (await api.get('/watchlist', { params: { profileId } })).data,
    enabled: !!profileId,
  });
};

export const useToggleWatchlist = () => {
  const profileId = useActiveProfileId();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ contentId, contentType, remove }) =>
      remove
        ? api.delete(`/watchlist/${contentId}`, { params: { profileId } })
        : api.post('/watchlist', { profileId, contentId, contentType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['watchlist', profileId] }),
  });
};

export const useContinueWatching = () => {
  const profileId = useActiveProfileId();
  return useQuery({
    queryKey: ['continue-watching', profileId],
    queryFn: async () => (await api.get('/continue-watching', { params: { profileId } })).data,
    enabled: !!profileId,
  });
};

export const useRecommendations = () => {
  const profileId = useActiveProfileId();
  return useQuery({
    queryKey: ['recommendations', profileId],
    queryFn: async () => (await api.get('/recommendations', { params: { profileId } })).data,
    enabled: !!profileId,
  });
};

export const useReportProgress = () => {
  const profileId = useActiveProfileId();
  return useMutation({
    // skipProfileInvalidation: this is fire-and-forget telemetry - a 403
    // here must not tear down the player session (see lib/api.js).
    mutationFn: ({ contentId, contentType, positionSec, durationSec }) =>
      api.post(
        '/watch-progress',
        { profileId, contentId, contentType, positionSec, durationSec },
        { skipProfileInvalidation: true },
      ),
  });
};

export const useRateContent = () => {
  const profileId = useActiveProfileId();
  return useMutation({
    mutationFn: ({ contentId, contentType, value }) =>
      api.post('/ratings', { profileId, contentId, contentType, value }),
  });
};
