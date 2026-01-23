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
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gray-950">
      <div className="w-full max-w-md">
        <div className="bg-gray-900 rounded-lg shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 hover:opacity-80 transition">
              <div className="bg-orange-500 p-3 rounded-lg">
                <Film className="w-8 h-8 text-white" />
              </div>
              <span className="text-3xl font-bold text-orange-500">NiePhim</span>
            </Link>
            <h2 className="text-xl font-semibold text-white mt-6">Quên Mật Khẩu</h2>
            <p className="text-gray-400 text-sm mt-2">
              Nhập email để nhận link đặt lại mật khẩu
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mb-4">
                <svg className="w-16 h-16 text-green-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Email đã được gửi!</h3>
              <p className="text-gray-400 text-sm mb-6">
                Vui lòng kiểm tra email <strong className="text-white">{email}</strong> để nhận link đặt lại mật khẩu.
              </p>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-lg transition text-white font-semibold"
              >
                Quay lại Đăng nhập
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                  placeholder="email@example.com"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    <span className="ml-2">Đang gửi...</span>
                  </>
                ) : (
                  'Gửi Link Đặt Lại Mật Khẩu'
                )}
              </button>

              <div className="text-center text-sm">
                <Link to="/login" className="text-gray-400 hover:text-white transition">
                  ← Quay lại Đăng nhập
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
