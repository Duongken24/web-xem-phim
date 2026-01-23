import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Bell, User, Menu, X, Film, LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setMobileMenuOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);

  return (
    <header className="bg-gray-950/95 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
      <div className="px-4 md:px-8 lg:px-16">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition">
            <div className="bg-orange-500 p-2 rounded">
              <Film className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-orange-500">NiePhim</div>
              <div className="text-xs text-gray-400 hidden sm:block">Xem Phim Chill Chill</div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/"
              className={`transition ${
                isActive('/') ? 'text-orange-500 font-semibold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Trang Chủ
            </Link>
            <Link
              to="/search"
              className={`transition ${
                isActive('/search') ? 'text-orange-500 font-semibold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Phim
            </Link>
            <Link
              to="/watchlist"
              className={`transition ${
                isActive('/watchlist') ? 'text-orange-500 font-semibold' : 'text-gray-300 hover:text-white'
              }`}
            >
              Danh Sách Của Tôi
            </Link>
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Desktop Search */}
            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm phim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-900 text-white pl-10 pr-4 py-2 rounded-full border border-gray-700 focus:border-orange-500 focus:outline-none w-64 transition"
                />
                <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              </div>
            </form>

            {/* User Menu - Desktop */}
            {user ? (
              <div className="hidden md:block relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-2 hover:bg-gray-800 rounded-full transition"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-900 rounded-lg shadow-xl border border-gray-800 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <p className="text-sm text-white font-semibold truncate">{user.email}</p>
                      <p className="text-xs text-gray-400">Thành viên</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition text-gray-300 hover:text-white"
                    >
                      <UserCircle className="w-5 h-5" />
                      Hồ sơ
                    </Link>
                    <Link
                      to="/watchlist"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition text-gray-300 hover:text-white"
                    >
                      <Bell className="w-5 h-5" />
                      Danh sách của tôi
                    </Link>
                    <hr className="border-gray-800 my-2" />
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        signOut();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition text-red-500 hover:text-red-400"
                    >
                      <LogOut className="w-5 h-5" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="hidden md:flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition"
              >
                <User className="w-5 h-5" />
                Đăng nhập
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-gray-800 rounded-full transition"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4 space-y-4">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="px-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm phim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-gray-900 text-white pl-10 pr-4 py-2 rounded-full border border-gray-700 focus:border-orange-500 focus:outline-none"
                />
                <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              </div>
            </form>

            {/* Mobile Navigation Links */}
            <nav className="flex flex-col space-y-2 px-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-4 rounded-lg transition ${
                  isActive('/') ? 'bg-orange-500 text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                Trang Chủ
              </Link>
              <Link
                to="/search"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-4 rounded-lg transition ${
                  isActive('/search') ? 'bg-orange-500 text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                Phim
              </Link>
              <Link
                to="/watchlist"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-4 rounded-lg transition ${
                  isActive('/watchlist') ? 'bg-orange-500 text-white font-semibold' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                Danh Sách Của Tôi
              </Link>

              {/* Mobile User Menu */}
              <hr className="border-gray-700" />
              {user ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-4 rounded-lg transition text-gray-300 hover:bg-gray-800"
                  >
                    👤 Hồ sơ
                  </Link>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="w-full text-left py-2 px-4 rounded-lg transition text-red-500 hover:bg-gray-800"
                  >
                    🚪 Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-4 rounded-lg transition bg-red-600 text-white hover:bg-red-700 text-center"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2 px-4 rounded-lg transition text-gray-300 hover:bg-gray-800 text-center"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
