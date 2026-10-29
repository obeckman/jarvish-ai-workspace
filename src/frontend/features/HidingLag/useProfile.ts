import { useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProfileResponse } from '@/shared/hidingLag.types';
import { fetchProfile, updateProfileName } from './api';
import { QUERY_KEYS, RYOW_WINDOW_MS } from './constants';

/**
 * Hides replication lag in two layers:
 * 1. Optimistic update: the UI shows the new name before the server answers.
 * 2. Read-your-own-writes: for a short window after a write, reads ask the
 *    server to use the primary, so the refetch can't return stale replica data.
 */
export function useProfile({ readYourOwnWrites }: { readYourOwnWrites: boolean }) {
  const queryClient = useQueryClient();
  const lastWriteAtRef = useRef(0);

  const shouldForcePrimary = () =>
    readYourOwnWrites && Date.now() - lastWriteAtRef.current < RYOW_WINDOW_MS;

  const query = useQuery({
    queryKey: QUERY_KEYS.USER_PROFILE,
    queryFn: ({ signal }) => fetchProfile({ forcePrimary: shouldForcePrimary(), signal }),
  });

  const mutation = useMutation({
    mutationFn: updateProfileName,
    onMutate: async (newName) => {
      // Stop in-flight refetches so they don't overwrite the optimistic value.
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.USER_PROFILE });

      // Snapshot for rollback.
      const previous = queryClient.getQueryData<ProfileResponse>(QUERY_KEYS.USER_PROFILE);

      if (previous) {
        queryClient.setQueryData<ProfileResponse>(QUERY_KEYS.USER_PROFILE, {
          ...previous,
          profile: { 
            ...previous.profile, name: newName },
          servedBy: 'optimisticUpdate',
        });
      }

      return { previous };
    },
    onSuccess: () => {
      lastWriteAtRef.current = Date.now();
    },
    onError: (_error, _newName, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEYS.USER_PROFILE, context.previous);
      }
    },
    onSettled: () => {
      // Background refetch. With read-your-own-writes on, this goes to the primary.
      return queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PROFILE });
    },
  });

  return { query, mutation };
}
