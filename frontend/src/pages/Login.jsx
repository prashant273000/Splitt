import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { me, devLogin, googleToken } from '../features/auth/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function Login() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [googleError, setGoogleError] = useState('');

  useEffect(() => {
    document.title = 'Sign in · Splitt';
  }, []);

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: me,
    retry: false,
  });

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    function init() {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setGoogleError('');
          try {
            await googleToken(credential);
            await queryClient.invalidateQueries({ queryKey: ['me'] });
            navigate('/');
          } catch (err) {
            setGoogleError(err.message);
          }
        },
      });
      window.google.accounts.id.renderButton(document.getElementById('google-signin-btn'), {
        theme: 'outline',
        size: 'large',
        width: 280,
      });
    }

    if (window.google?.accounts?.id) {
      init();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      if (script) script.addEventListener('load', init);
    }
  }, [navigate, queryClient]);

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm p-8 max-w-sm w-full text-center">
        <h1 className="text-3xl font-bold mb-2">Splitt</h1>
        <p className="text-gray-500 mb-8 text-sm">A better way to share autos out of campus.</p>

        {googleError && (
          <p className="text-red-600 text-sm mb-5 bg-red-50 rounded-md px-3 py-2">{googleError}</p>
        )}

        {GOOGLE_CLIENT_ID ? (
          <div className="flex justify-center">
            <div id="google-signin-btn" />
          </div>
        ) : (
          <p className="text-sm text-gray-400 border border-dashed border-gray-300 rounded-md px-4 py-3">
            Google sign-in not configured. <span className="font-mono">VITE_GOOGLE_CLIENT_ID</span>{' '}
            is missing.
          </p>
        )}

        {import.meta.env.DEV && (
          <>
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400">local dev only</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
            <button
              className="w-full bg-gray-100 text-gray-700 rounded-md px-4 py-2.5 text-sm font-medium hover:bg-gray-200 transition-colors"
              onClick={async () => {
                await devLogin('dev@iiitdmj.ac.in', 'Dev User');
                await queryClient.invalidateQueries({ queryKey: ['me'] });
                navigate('/');
              }}
            >
              Dev Login
            </button>
          </>
        )}

        <p className="mt-6 text-xs text-gray-400">IIIT Jabalpur students only</p>
      </div>
    </div>
  );
}
