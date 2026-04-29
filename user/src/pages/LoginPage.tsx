import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Film } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/ui/LoadingSpinner';

type FromLocationState =
  | {
      pathname?: string;
      search?: string;
      hash?: string;
    }
  | string
  | undefined;

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { signIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromState = ((location.state as { from?: FromLocationState } | null)?.from ?? '/') as FromLocationState;
  const from = useMemo(() => {
    if (typeof fromState === 'string') return fromState || '/';
    if (fromState?.pathname) {
      return `${fromState.pathname}${fromState.search ?? ''}${fromState.hash ?? ''}`;
    }
    return '/';
  }, [fromState]);

  const redirectedFromWatch = from.startsWith('/watch');

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn(email, password);

    if (result.success) {
      const role = result.user?.role || result.user?.user_metadata?.role;

      if (role === 'admin' || isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } else {
      setError(result.error || 'Đăng nhập thất bại.');
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 transition hover:opacity-80">
            <div className="rounded-lg bg-orange-500 p-3">
              <Film className="h-8 w-8 text-white" />
            </div>
            <span className="text-3xl font-bold text-orange-500">Thêm Phim</span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Đăng nhập</h1>
          <p className="mt-2 text-gray-400">Chào mừng bạn quay trở lại.</p>
          {redirectedFromWatch && (
            <p className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
              Đăng nhập để tiếp tục xem phim bạn vừa chọn.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-gray-900 p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="your@email.com"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-gray-300">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white placeholder-gray-500 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="••••••••"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500 bg-red-500/10 p-3">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-gray-400 transition hover:text-orange-500"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Đang đăng nhập...</span>
                </>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Chưa có tài khoản?{' '}
              <Link to="/register" className="text-blue-500 transition hover:text-blue-400 hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="text-gray-400 transition hover:text-white">
            ← Quay về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
