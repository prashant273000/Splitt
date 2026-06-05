import { useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmMatch, rejectMatch } from './api';

export function useConfirmMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['myRides'] });
    },
  });
}

export function useRejectMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rejectMatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
