import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function PasswordResetPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-lg bg-gray-900 p-8 shadow-xl">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2 transition hover:opacity-80">
              <div className="rounded-lg bg-orange-500 p-3">
                <Film className="h-8 w-8 text-white" />
              </div>
              <span className="text-3xl font-bold text-orange-500">Thêm Phim</span>
            </Link>
            <h2 className="mt-6 text-xl font-semibold text-white">Quên mật khẩu</h2>
            <p className="mt-2 text-sm text-gray-400">
              Nhập email để nhận link đặt lại mật khẩu.
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mb-4">
                <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Email đã được gửi!</h3>
              <p className="mb-6 text-sm text-gray-400">
                Vui lòng kiểm tra email <strong className="text-white">{email}</strong> để nhận link đặt lại mật khẩu.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/login"
                  className="inline-block rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white transition hover:bg-orange-600"
                >
                  Quay lại đăng nhập
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="text-sm text-gray-400 transition hover:text-white"
                >
                  Gửi cho email khác
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-lg border border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  {error}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="email@example.com"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center rounded-lg bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Đang gửi...</span>
                  </>
                ) : (
                  'Gửi link đặt lại mật khẩu'
                )}
              </button>

              <div className="text-center text-sm">
                <Link to="/login" className="text-gray-400 transition hover:text-white">
                  ← Quay lại đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
