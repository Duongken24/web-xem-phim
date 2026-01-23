import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Calendar, LogOut } from 'lucide-react';
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
  const fullName = user.user_metadata?.full_name || 'User';
  const memberSince = new Date(user.created_at).toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-8 lg:px-16 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Hồ sơ của tôi</h1>
          <p className="text-gray-400">Quản lý thông tin cá nhân và cài đặt tài khoản</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gray-900 rounded-lg p-8 mb-6">
          <div className="flex items-center gap-6 mb-8">
            {/* Avatar */}
            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
              <span className="text-4xl font-bold text-white">
                {fullName.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* User Info */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">{fullName}</h2>
              <p className="text-gray-400">{userEmail}</p>
            </div>
          </div>

          {/* User Details */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Email */}
            <div className="flex items-start gap-3 p-4 bg-gray-800 rounded-lg">
              <Mail className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400 mb-1">Email</p>
                <p className="text-white font-medium">{userEmail}</p>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-start gap-3 p-4 bg-gray-800 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400 mb-1">Thành viên từ</p>
                <p className="text-white font-medium">{memberSince}</p>
              </div>
            </div>

            {/* User ID */}
            <div className="flex items-start gap-3 p-4 bg-gray-800 rounded-lg">
              <User className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400 mb-1">User ID</p>
                <p className="text-white font-medium text-xs font-mono">{user.id.slice(0, 16)}...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-gray-900 rounded-lg p-8 mb-6">
          <h3 className="text-xl font-bold text-white mb-6">Thống kê</h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-3xl font-bold text-orange-500 mb-2">0</p>
              <p className="text-sm text-gray-400">Phim yêu thích</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-3xl font-bold text-orange-500 mb-2">0</p>
              <p className="text-sm text-gray-400">Đã đánh giá</p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <p className="text-3xl font-bold text-orange-500 mb-2">0</p>
              <p className="text-sm text-gray-400">Giờ xem</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-gray-900 rounded-lg p-8">
          <h3 className="text-xl font-bold text-white mb-6">Cài đặt tài khoản</h3>
          <div className="space-y-4">
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition"
            >
              <LogOut className="w-5 h-5" />
              Đăng xuất
            </button>

            {/* Future Actions */}
            <button
              disabled
              className="w-full bg-gray-800 text-gray-500 font-semibold py-3 rounded-lg cursor-not-allowed"
            >
              Đổi mật khẩu (Sắp ra mắt)
            </button>
            <button
              disabled
              className="w-full bg-gray-800 text-gray-500 font-semibold py-3 rounded-lg cursor-not-allowed"
            >
              Cài đặt thông báo (Sắp ra mắt)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
