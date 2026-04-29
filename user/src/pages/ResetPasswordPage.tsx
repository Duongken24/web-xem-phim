import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Film } from 'lucide-react';
import { supabase } from '../lib/supabase';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setIsValidSession(true);
      }
      setCheckingSession(false);
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu không khớp.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-3 text-sm text-gray-400">Đang kiểm tra phiên đặt lại mật khẩu...</p>
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-lg bg-gray-900 p-8 text-center shadow-xl">
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-white">Liên kết không hợp lệ</h3>
            <p className="mb-6 text-sm text-gray-400">
              Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu gửi lại email.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                to="/forgot-password"
                className="inline-block rounded-lg bg-orange-500 px-6 py-2 font-semibold text-white transition hover:bg-orange-600"
              >
                Gửi lại email
              </Link>
              <Link to="/login" className="text-sm text-gray-400 transition hover:text-white">
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <h2 className="mt-6 text-xl font-semibold text-white">Đặt lại mật khẩu</h2>
            <p className="mt-2 text-sm text-gray-400">
              Nhập mật khẩu mới cho tài khoản của bạn.
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mb-4">
                <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Đặt lại mật khẩu thành công!</h3>
              <p className="text-sm text-gray-400">Đang chuyển hướng đến trang đăng nhập...</p>
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
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ít nhất 6 ký tự"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Xác nhận mật khẩu
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Nhập lại mật khẩu"
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
                    <span className="ml-2">Đang cập nhật...</span>
                  </>
                ) : (
                  'Đặt lại mật khẩu'
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
