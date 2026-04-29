import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  Clock3,
  Film,
  LogOut,
  Menu,
  Search,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useMovieGenres } from '../../hooks/useTMDB';

const Header: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, loading, isAdmin } = useAuth();
  const headerRef = useRef<HTMLElement>(null);
  const { genres } = useMovieGenres();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 25 }, (_, i) => currentYear - i);

  const closeAllMenus = () => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
    setGenreDropdownOpen(false);
    setYearDropdownOpen(false);
  };

  const displayName = useMemo(() => {
    if (!user) return '';
    const fullName = user.user_metadata?.full_name?.trim();
    if (fullName) return fullName;
    const emailName = user.email?.split('@')[0]?.trim();
    return emailName || 'Tài khoản Thèm Phim';
  }, [user]);

  const userEmail = user?.email || '';
  const userInitial = (displayName || userEmail || 'T').charAt(0).toUpperCase();

  const accountLinks = [
    {
      to: '/watchlist',
      icon: Bookmark,
      title: 'Watchlist',
      description: 'Những bộ phim bạn đã lưu để xem sau',
    },
    {
      to: '/history',
      icon: Clock3,
      title: 'Lịch sử xem',
      description: 'Quay lại các phim bạn đang theo dõi',
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      closeAllMenus();
    }
  };

  const handleLogout = async () => {
    closeAllMenus();
    await signOut();
    navigate('/');
  };

  const handleNavigate =
    (to: string) => (event: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      event.preventDefault();
      closeAllMenus();
      navigate(to);
    };

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        closeAllMenus();
      }
    };

    if (mobileMenuOpen || userMenuOpen || genreDropdownOpen || yearDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [genreDropdownOpen, mobileMenuOpen, userMenuOpen, yearDropdownOpen]);

  useEffect(() => {
    closeAllMenus();
  }, [location.hash, location.pathname, location.search]);

  return (
    <header ref={headerRef} className="sticky top-0 z-[100] border-b border-gray-800 bg-gray-950/95 backdrop-blur-sm">
      <div className="px-4 md:px-8 lg:px-16">
        <div className="flex h-16 items-center justify-between md:h-20">
          <Link to="/" onClick={handleNavigate('/')} className="flex items-center gap-2 transition hover:opacity-80">
            <div className="rounded bg-orange-500 p-2">
              <Film className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold text-orange-500">Thèm Phim</div>
              <div className="hidden text-xs text-gray-400 sm:block">Xem phim chill chill</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/"
              onClick={handleNavigate('/')}
              className={`transition ${
                isActive('/') ? 'font-semibold text-orange-500' : 'text-gray-300 hover:text-white'
              }`}
            >
              Trang chủ
            </Link>
            <Link
              to="/search"
              onClick={handleNavigate('/search')}
              className={`transition ${
                isActive('/search') ? 'font-semibold text-orange-500' : 'text-gray-300 hover:text-white'
              }`}
            >
              Phim
            </Link>

            <div
              className="relative"
              onMouseEnter={() => {
                setGenreDropdownOpen(true);
                setYearDropdownOpen(false);
                setUserMenuOpen(false);
              }}
              onMouseLeave={() => setGenreDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setGenreDropdownOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setYearDropdownOpen(false);
                      setUserMenuOpen(false);
                    }
                    return next;
                  });
                }}
                className="flex items-center gap-1 py-2 text-gray-300 transition hover:text-white"
              >
                Thể loại
                <ChevronDown className={`h-4 w-4 transition-transform ${genreDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {genreDropdownOpen && (
                <div className="absolute left-0 top-full pt-2">
                  <div className="w-64 overflow-hidden rounded-lg border border-gray-800 bg-gray-900 shadow-xl">
                    <div className="max-h-96 overflow-y-auto py-2">
                      {genres.map((genre) => (
                        <Link
                          key={genre.id}
                          to={`/genre/${genre.id}`}
                          className="block px-4 py-2 text-gray-300 transition hover:bg-gray-800 hover:text-orange-500"
                          onClick={handleNavigate(`/genre/${genre.id}`)}
                        >
                          {genre.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div
              className="relative"
              onMouseEnter={() => {
                setYearDropdownOpen(true);
                setGenreDropdownOpen(false);
                setUserMenuOpen(false);
              }}
              onMouseLeave={() => setYearDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => {
                  setYearDropdownOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setGenreDropdownOpen(false);
                      setUserMenuOpen(false);
                    }
                    return next;
                  });
                }}
                className="flex items-center gap-1 py-2 text-gray-300 transition hover:text-white"
              >
                Năm phát hành
                <ChevronDown className={`h-4 w-4 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {yearDropdownOpen && (
                <div className="absolute left-0 top-full pt-2">
                  <div className="w-48 overflow-hidden rounded-lg border border-gray-800 bg-gray-900 shadow-xl">
                    <div className="max-h-96 overflow-y-auto py-2">
                      {years.map((year) => (
                        <Link
                          key={year}
                          to={`/year/${year}`}
                          className="block px-4 py-2 text-gray-300 transition hover:bg-gray-800 hover:text-orange-500"
                          onClick={handleNavigate(`/year/${year}`)}
                        >
                          {year}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/watchlist"
              onClick={handleNavigate('/watchlist')}
              className={`transition ${
                isActive('/watchlist') ? 'font-semibold text-orange-500' : 'text-gray-300 hover:text-white'
              }`}
            >
              Danh sách của tôi
            </Link>

            {user && isAdmin && (
              <Link
                to="/admin"
                onClick={handleNavigate('/admin')}
                className={`transition ${
                  location.pathname.startsWith('/admin')
                    ? 'font-semibold text-orange-500'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm phim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 rounded-full border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-white transition focus:border-orange-500 focus:outline-none"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </form>

            {loading ? (
              <div className="hidden h-11 w-44 animate-pulse rounded-full bg-gray-800 md:block" />
            ) : user ? (
              <div className="relative hidden md:block">
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen((prev) => {
                      const next = !prev;
                      if (next) {
                        setGenreDropdownOpen(false);
                        setYearDropdownOpen(false);
                        setMobileMenuOpen(false);
                      }
                      return next;
                    });
                  }}
                  className="flex items-center gap-3 rounded-full border border-gray-800 bg-gray-900 px-3 py-2 transition hover:border-gray-700 hover:bg-gray-800"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-red-600 text-sm font-bold text-white">
                    {userInitial}
                  </div>
                  <div className="max-w-[140px] text-left">
                    <p className="truncate text-sm font-semibold text-white">{displayName}</p>
                    <p className="truncate text-xs text-gray-400">{userEmail}</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-80 overflow-hidden rounded-3xl border border-white/10 bg-gray-900/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                    <div className="border-b border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-black px-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-base font-bold text-white">
                          {userInitial}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-300">
                            Tài khoản Thèm Phim
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-white">{displayName}</p>
                          <p className="truncate text-xs text-gray-400">{userEmail}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2">
                      <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                        Truy cập nhanh
                      </p>

                      {accountLinks.map((item) => {
                        const Icon = item.icon;

                        return (
                          <Link
                            key={item.to}
                            to={item.to}
                            onClick={handleNavigate(item.to)}
                            className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                              isActive(item.to)
                                ? 'bg-white/[0.05] text-white'
                                : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                            }`}
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.04] text-orange-400 transition group-hover:bg-orange-500/10">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{item.title}</p>
                              <p className="text-xs text-gray-500">{item.description}</p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
                          </Link>
                        );
                      })}
                    </div>

                    <div className="border-t border-white/10 p-2">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                          <LogOut className="h-5 w-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">Đăng xuất</p>
                          <p className="text-xs text-red-300/70">Kết thúc phiên làm việc hiện tại</p>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  to="/register"
                  className="rounded-lg border border-gray-700 px-4 py-2 font-semibold text-white transition hover:border-gray-500 hover:bg-gray-900"
                >
                  Đăng ký
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
                >
                  <User className="h-5 w-5" />
                  Đăng nhập
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen((prev) => {
                  const next = !prev;
                  if (next) {
                    setUserMenuOpen(false);
                    setGenreDropdownOpen(false);
                    setYearDropdownOpen(false);
                  }
                  return next;
                });
              }}
              className="rounded-full p-2 transition hover:bg-gray-800 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-4 border-t border-gray-800 py-4 md:hidden">
            <form onSubmit={handleSearch} className="px-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm phim..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-full border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-white focus:border-orange-500 focus:outline-none"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </form>

            <nav className="flex flex-col space-y-2 px-2">
              <Link
                to="/"
                onClick={handleNavigate('/')}
                className={`rounded-lg px-4 py-2 transition ${
                  isActive('/') ? 'bg-orange-500 font-semibold text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                Trang chủ
              </Link>
              <Link
                to="/search"
                onClick={handleNavigate('/search')}
                className={`rounded-lg px-4 py-2 transition ${
                  isActive('/search') ? 'bg-orange-500 font-semibold text-white' : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                Phim
              </Link>

              <div className="px-4 py-2">
                <p className="mb-2 text-sm text-gray-500">Thể loại</p>
                <div className="flex flex-wrap gap-2">
                  {genres.slice(0, 8).map((genre) => (
                    <Link
                      key={genre.id}
                      to={`/genre/${genre.id}`}
                      onClick={handleNavigate(`/genre/${genre.id}`)}
                      className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300 transition hover:bg-gray-700 hover:text-orange-500"
                    >
                      {genre.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="px-4 py-2">
                <p className="mb-2 text-sm text-gray-500">Năm phát hành</p>
                <div className="flex flex-wrap gap-2">
                  {years.slice(0, 8).map((year) => (
                    <Link
                      key={year}
                      to={`/year/${year}`}
                      onClick={handleNavigate(`/year/${year}`)}
                      className="rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300 transition hover:bg-gray-700 hover:text-orange-500"
                    >
                      {year}
                    </Link>
                  ))}
                </div>
              </div>

              {user ? (
                <>
                  <div className="mx-2 rounded-2xl border border-gray-800 bg-gray-900 px-4 py-4">
                    <p className="text-sm text-gray-400">Tài khoản đang dùng</p>
                    <p className="mt-1 truncate text-base font-semibold text-white">{displayName}</p>
                    <p className="truncate text-sm text-gray-400">{userEmail}</p>
                  </div>

                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={handleNavigate('/admin')}
                      className={`rounded-lg px-4 py-2 transition ${
                        location.pathname.startsWith('/admin')
                          ? 'bg-orange-500 font-semibold text-white'
                          : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      Admin
                    </Link>
                  )}

                  {accountLinks.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={handleNavigate(item.to)}
                      className={`rounded-lg px-4 py-2 transition ${
                        isActive(item.to) ? 'bg-orange-500 font-semibold text-white' : 'text-gray-300 hover:bg-gray-800'
                      }`}
                    >
                      {item.title}
                    </Link>
                  ))}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full rounded-lg px-4 py-2 text-left text-red-400 transition hover:bg-gray-800"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <div className="space-y-2 px-2">
                  <Link
                    to="/register"
                    onClick={handleNavigate('/register')}
                    className="block rounded-lg border border-gray-700 px-4 py-2 text-center font-semibold text-white transition hover:border-gray-500 hover:bg-gray-900"
                  >
                    Đăng ký
                  </Link>
                  <Link
                    to="/login"
                    onClick={handleNavigate('/login')}
                    className="block rounded-lg bg-red-600 px-4 py-2 text-center font-semibold text-white transition hover:bg-red-700"
                  >
                    Đăng nhập
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
