import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyRides, createRide, cancelRide } from './api';

export function useMyRides(enabled = true) {
  return useQuery({
    queryKey: ['myRides'],
    queryFn: getMyRides,
    enabled,
    retry: false,
  });
}

export function useCreateRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRides'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useCancelRide() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelRide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRides'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}
