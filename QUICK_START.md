# ⚡ Quick Start Guide - NiePhim Project

## 🎯 Tóm Tắt Project

**NiePhim** - Nền tảng streaming phim với giao diện Netflix-style

**Tech Stack**:
- Frontend: React 19 + TypeScript + Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth)
- API: TMDB (The Movie Database)
- Build Tool: Vite

**Status**: ✅ Giao diện hoàn thành, ✅ TMDB API đã tích hợp

---

## 🚀 Chạy Project

### 1. Start Dev Server
```bash
cd user
npm run dev
```

Mở browser: **http://localhost:5173**

### 2. Xem Test Page (TMDB Connection)
- Mặc định: Hiển thị **TestTMDBPage** (verify TMDB API)
- Để xem HomePage: Đổi `showTestPage = false` trong `App.tsx`

---

## 📁 Cấu Trúc Project

```
d:\Đồ án\Đồ án Thực Tập\
├── user/                           # Frontend React App
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/            # Header, Footer, Layout
│   │   │   ├── movie/             # MovieCard, MovieGrid
│   │   │   └── ui/                # Slider, SearchBar, Filter, etc.
│   │   ├── pages/
│   │   │   ├── HomePage.tsx       # Homepage with mock data
│   │   │   ├── HomePageTMDB.tsx   # Homepage with TMDB API
│   │   │   └── TestTMDBPage.tsx   # Test TMDB connection
│   │   ├── services/
│   │   │   └── tmdb.service.ts    # TMDB API wrapper (20+ functions)
│   │   ├── hooks/
│   │   │   └── useTMDB.ts         # 9 custom React hooks
│   │   ├── types/
│   │   │   └── tmdb.types.ts      # TypeScript types
│   │   ├── data/
│   │   │   └── mockData.ts        # Mock data for demo
│   │   └── lib/
│   │       └── supabase.ts        # Supabase client
│   └── .env                       # Environment variables
├── backend/                        # Express.js API (minimal)
├── admin/                          # Admin panel (chưa build)
├── database/
│   └── migrations/                 # SQL migrations
├── ROADMAP.md                      # Lộ trình phát triển
├── TMDB_SETUP_GUIDE.md            # Hướng dẫn setup TMDB
├── TMDB_HOOKS_GUIDE.md            # Hướng dẫn sử dụng hooks
└── QUICK_START.md                 # File này
```

---

## 🔑 Environment Variables

### File: `user/.env`

```env
# Supabase
VITE_SUPABASE_URL=https://cbritkburuyzjhensgil.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_KiWlEyLPakKTMooOoy4Swg_soy8hzds

# TMDB API
VITE_TMDB_API_KEY=e5c558b8e47fd35ed2e2fb5b3e997b1a  ✅ Đã có
VITE_TMDB_BASE_URL=https://api.themoviedb.org/3
VITE_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
```

---

## 🎬 Features Đã Hoàn Thành

### ✅ Giao Diện (Netflix-style)
- [x] Header với navigation và search
- [x] Hero Slider full-width (85vh)
- [x] MovieCard với hover effect
- [x] MovieGrid responsive
- [x] Footer
- [x] Dark theme

### ✅ TMDB Integration
- [x] TMDB Service với 20+ functions
- [x] 9 Custom React Hooks
- [x] TypeScript types đầy đủ
- [x] Test page để verify connection
- [x] HomePage với TMDB data

### ✅ Components Library
- [x] Layout (Header, Footer)
- [x] MovieCard, MovieGrid
- [x] Slider, SearchBar, Filter
- [x] Pagination, LoadingSpinner
- [x] SectionTitle, CategoryBadge, Breadcrumb

---

## 📚 Cách Sử Dụng TMDB

### Basic Usage (Service)

```tsx
import TMDBService from '../services/tmdb.service';

// Search movies
const results = await TMDBService.searchMovies({ query: 'Avengers' });

// Get movie details
const movie = await TMDBService.getMovieDetails(299536);

// Get popular movies
const popular = await TMDBService.getPopularMovies(1);

// Get image URL
const posterUrl = TMDBService.getTMDBImageUrl('/path.jpg', 'w500');
```

### React Hooks Usage

```tsx
import { usePopularMovies, useTrendingMovies } from '../hooks/useTMDB';

function MyComponent() {
  const { movies, loading, error } = usePopularMovies(1);

  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;

  return (
    <div>
      {movies.map(movie => <MovieCard key={movie.id} movie={movie} />)}
    </div>
  );
}
```

**Available Hooks**:
1. `useMovieSearch` - Tìm kiếm
2. `useMovieDetails` - Chi tiết phim
3. `usePopularMovies` - Phim phổ biến
4. `useTrendingMovies` - Phim trending
5. `useTopRatedMovies` - Phim rating cao
6. `useMovieGenres` - Danh sách thể loại
7. `useMoviesByGenre` - Phim theo thể loại
8. `useNowPlayingMovies` - Phim đang chiếu
9. `useDiscoverMovies` - Discover với filters

Chi tiết: Xem [TMDB_HOOKS_GUIDE.md](TMDB_HOOKS_GUIDE.md)

---

## 🗄️ Database (Supabase)

### Current Tables (18 tables)
- ✅ movies, episodes, video_qualities
- ✅ genres, countries, movie_genres
- ✅ profiles, favorites, ratings, comments
- ✅ watch_history, ai_recommendations, ai_chat_history
- ❌ actors, directors (SẼ XÓA - dùng TMDB API)

### Recommended Cleanup
Xóa 4 bảng không cần:
```sql
DROP TABLE movie_actors;
DROP TABLE movie_directors;
DROP TABLE actors;
DROP TABLE directors;
```

Thêm columns cho TMDB integration:
```sql
ALTER TABLE movies ADD COLUMN tmdb_id INTEGER UNIQUE;
ALTER TABLE movies ADD COLUMN imdb_id TEXT;
ALTER TABLE movies ADD COLUMN quality TEXT;
ALTER TABLE genres ADD COLUMN tmdb_id INTEGER;
```

Chi tiết: Xem [ROADMAP.md](ROADMAP.md)

---

## 🎯 Lộ Trình Build Tiếp Theo

### Phase 1: Core Features (Priority: HIGH)
1. **Movie Detail Page** ⭐⭐⭐
   - Hiển thị thông tin chi tiết từ TMDB
   - Cast & Crew
   - Trailer video
   - Similar movies

2. **Search Page** ⭐⭐⭐
   - Real-time search với TMDB
   - Search suggestions
   - Filter results

3. **Authentication** ⭐⭐⭐
   - Login/Register với Supabase Auth
   - Profile page
   - Session management

### Phase 2: User Features
4. **Video Player**
   - Video playback component
   - Multiple qualities
   - Episode navigation (for series)

5. **User Interactions**
   - Add to favorites
   - Rate & review
   - Comments
   - Watch history tracking

### Phase 3: Admin Panel
6. **Admin Dashboard**
   - Import phim từ TMDB
   - Upload video URLs
   - User management

Chi tiết đầy đủ: Xem [ROADMAP.md](ROADMAP.md)

---

## 📖 Tài Liệu

### Guides
- **[ROADMAP.md](ROADMAP.md)** - Lộ trình phát triển chi tiết
- **[TMDB_SETUP_GUIDE.md](TMDB_SETUP_GUIDE.md)** - Hướng dẫn setup TMDB API
- **[TMDB_HOOKS_GUIDE.md](TMDB_HOOKS_GUIDE.md)** - Hướng dẫn sử dụng hooks

### Key Files
- **[tmdb.service.ts](user/src/services/tmdb.service.ts)** - TMDB API functions
- **[useTMDB.ts](user/src/hooks/useTMDB.ts)** - React hooks
- **[tmdb.types.ts](user/src/types/tmdb.types.ts)** - TypeScript types
- **[HomePageTMDB.tsx](user/src/pages/HomePageTMDB.tsx)** - Example usage

### External Links
- 🎬 TMDB API Docs: https://developers.themoviedb.org/3
- 🔑 TMDB Settings: https://www.themoviedb.org/settings/api
- 📚 Supabase Docs: https://supabase.com/docs

---

## 🔥 Common Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Type check
tsc --noEmit
```

---

## 🐛 Troubleshooting

### TMDB API không hoạt động?
1. Kiểm tra API key trong `.env`
2. Restart dev server sau khi thay đổi `.env`
3. Verify API key tại https://www.themoviedb.org/settings/api

### Images không load?
1. Kiểm tra `VITE_TMDB_IMAGE_BASE_URL` trong `.env`
2. TMDB image URLs cần format: `https://image.tmdb.org/t/p/{size}{path}`
3. Sử dụng `TMDBService.getTMDBImageUrl(path, size)` để generate URLs

### Supabase connection failed?
1. Kiểm tra `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`
2. Verify credentials tại https://supabase.com/dashboard

---

## 🎯 Next Immediate Steps

**Bạn nên làm gì tiếp theo?**

### Option A: Test TMDB Connection
1. Mở http://localhost:5173 (đang show TestTMDBPage)
2. Xem 6 phim popular từ TMDB
3. Nếu thành công → Chuyển sang Option B

### Option B: Build Movie Detail Page
1. Đọc [TMDB_HOOKS_GUIDE.md](TMDB_HOOKS_GUIDE.md)
2. Xem ví dụ `useMovieDetails` hook
3. Tạo file `MovieDetailPage.tsx`
4. Implement:
   - Movie info từ TMDB
   - Cast & Crew
   - Trailer
   - Similar movies

### Option C: Build Search Feature
1. Dùng hook `useMovieSearch`
2. Implement SearchBar component
3. Tạo SearchResultsPage
4. Add debounced search

---

## 💡 Tips

1. **Luôn dùng hooks** thay vì gọi service trực tiếp trong components
2. **Check loading states** trước khi render data
3. **Handle errors** gracefully
4. **Use TypeScript types** từ `tmdb.types.ts`
5. **Optimize images** bằng cách chọn size phù hợp (w342, w500, w780)

---

## ✅ Checklist Setup

- [x] Node.js installed
- [x] Dependencies installed (`npm install`)
- [x] Dev server running (`npm run dev`)
- [x] `.env` configured với Supabase credentials
- [x] `.env` configured với TMDB API key
- [x] TMDB API connection verified
- [ ] Database cleanup (xóa 4 tables không cần)
- [ ] Movie Detail Page built
- [ ] Authentication implemented
- [ ] Video player built
- [ ] Admin panel built

---

**🎉 Bạn đã sẵn sàng build NiePhim! Let's go! 🚀**
