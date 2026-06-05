import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { me } from './api';

export function useRequireAuth() {
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: false,
  });

  useEffect(() => {
    if (!query.isLoading && query.error) {
      navigate('/login', { replace: true });
    }
  }, [query.isLoading, query.error, navigate]);

  return query;
}
