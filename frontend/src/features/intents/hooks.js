import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createIntent, cancelIntent } from './api';

export function useCreateIntent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createIntent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intents'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useCancelIntent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelIntent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intents'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
