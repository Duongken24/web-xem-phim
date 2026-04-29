import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, LogOut, Mail } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const ProfilePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) return null;

  const userEmail = user.email || 'N/A';
  const fullName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Tai khoan Them Phim';
  const avatarUrl = typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : '';
  const memberSince = new Date(user.created_at).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-950 pb-16 pt-24">
      <div className="container mx-auto max-w-4xl px-4 md:px-8 lg:px-16">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-white md:text-4xl">Tai khoan cua toi</h1>
          <p className="text-gray-400">Quan ly thong tin co ban va trang thai tai khoan Them Phim.</p>
        </div>

        <div className="mb-6 rounded-lg bg-gray-900 p-8">
          <div className="mb-8 flex items-center gap-6">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600">
                <span className="text-4xl font-bold text-white">{fullName.charAt(0).toUpperCase()}</span>
              </div>
            )}

            <div>
              <h2 className="mb-1 text-2xl font-bold text-white">{fullName}</h2>
              <p className="text-gray-400">{userEmail}</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg bg-gray-800 p-4">
              <Mail className="mt-0.5 h-5 w-5 text-orange-500" />
              <div>
                <p className="mb-1 text-sm text-gray-400">Email</p>
                <p className="font-medium text-white">{userEmail}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg bg-gray-800 p-4">
              <Calendar className="mt-0.5 h-5 w-5 text-orange-500" />
              <div>
                <p className="mb-1 text-sm text-gray-400">Thanh vien tu</p>
                <p className="font-medium text-white">{memberSince}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-gray-900 p-8">
          <h3 className="mb-6 text-xl font-bold text-white">Tai khoan</h3>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-3 rounded-lg bg-red-600 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            <LogOut className="h-5 w-5" />
            Dang xuat
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
