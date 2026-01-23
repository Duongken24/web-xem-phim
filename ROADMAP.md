# 🎬 Lộ Trình Phát Triển NiePhim

## 📊 Tổng Quan Dự Án

**Tên dự án**: NiePhim - Nền tảng xem phim trực tuyến
**Tech Stack**: React 19 + TypeScript + Vite + Tailwind CSS + Supabase + TMDB API
**Kiến trúc**: Hybrid Architecture (TMDB cho metadata, Supabase cho user data)

---

## ✅ PHASE 1: Integration Setup & Routing (HOÀN THÀNH)

### Week 1: TMDB API Integration ✅

**Đã hoàn thành**:
- [x] Đăng ký TMDB API key
- [x] Tạo service layer cho TMDB API calls
- [x] Tạo 9 custom hooks cho TMDB data fetching
- [x] Setup environment variables (.env)
- [x] Tạo TypeScript types cho TMDB responses
- [x] Tạo Supabase service cho user data
- [x] Tạo authentication hooks
- [x] Tạo watchlist management hooks
- [x] Tạo app constants

**Files đã tạo**:
```
user/src/
├── services/
│   ├── tmdb.service.ts          ✅ TMDB API wrapper (hoàn chỉnh)
│   └── supabase.service.ts      ✅ Supabase CRUD operations
├── hooks/
│   ├── useTMDB.ts               ✅ 9 custom hooks cho TMDB
│   ├── useAuth.ts               ✅ Authentication hooks
│   └── useWatchlist.ts          ✅ Watchlist management
├── types/
│   └── tmdb.types.ts            ✅ TypeScript types đầy đủ
└── utils/
    └── constants.ts             ✅ App constants & configs
```

**TMDB Service Methods**:
```typescript
// Movie Information
✅ getTMDBMovie(id)              // Chi tiết phim
✅ searchTMDBMovies(query)       // Tìm kiếm
✅ getPopularMovies(page)        // Phim phổ biến
✅ getTrendingMovies(timeWindow) // Phim trending
✅ getMoviesByGenre(genreId)     // Lọc theo thể loại
✅ getSimilarMovies(id)          // Phim tương tự

// Credits & Media
✅ getTMDBCredits(id)            // Cast & crew
✅ getTMDBVideos(id)             // Trailers
✅ getMovieGenres()              // Danh sách thể loại

// Utility Methods
✅ getTMDBImageUrl(path, size)   // Image URL builder
✅ getTrailer(videos)            // Extract YouTube trailer
✅ getDirector(credits)          // Get director name
✅ getMainCast(credits, limit)   // Get main actors
✅ formatRating(rating)          // Format rating display
✅ formatRuntime(minutes)        // Format runtime display
```

**Custom Hooks**:
```typescript
✅ useMovieDetails(id)           // Movie + credits + videos
✅ useMovieSearch(query)         // Search results
✅ usePopularMovies(page)        // Popular movies
✅ useTrendingMovies(timeWindow) // Trending movies
✅ useMoviesByGenre(genreId)     // Movies by genre
✅ useMovieGenres()              // Genre list
✅ useSimilarMovies(id)          // Similar movies
✅ useMovieVideos(id)            // Videos/trailers
✅ useMovieCredits(id)           // Cast & crew
```

### Week 1.5: Routing & Navigation ✅

**Đã hoàn thành**:
- [x] Cài đặt React Router DOM v7.12.0
- [x] Setup BrowserRouter trong App.tsx
- [x] Tạo Header component với navigation
- [x] Implement search functionality
- [x] Mobile responsive hamburger menu
- [x] Active route highlighting
- [x] Update MovieCard với Link navigation
- [x] Tạo 5 pages với routing

**Routes đã implement**:
```typescript
/ → HomePageTMDB              ✅ Homepage với TMDB data
/movie/:id → MovieDetailPage  ✅ Chi tiết phim đầy đủ (PRIORITY)
/search → SearchPage          ✅ Tìm kiếm + pagination
/genre/:id → GenrePage        ✅ Lọc theo thể loại + pagination
/watchlist → WatchlistPage    ✅ Skeleton (Phase 2 auth)
```

**Pages đã tạo**:

1. **HomePageTMDB.tsx** ✅
   - Hero slider với trending movies
   - Popular movies section
   - Trending movies section
   - Responsive grid layout

2. **MovieDetailPage.tsx** ✅ (PRIORITY PAGE - HOÀN CHỈNH)
   - Hero section với backdrop image
   - Movie info grid:
     - Poster image
     - Rating (TMDB vote_average)
     - Release year
     - Runtime
     - Age rating
     - Genres (clickable links)
     - Director name
     - Overview/description
   - Action buttons:
     - "Xem Ngay" (Watch Now)
     - "Thêm vào Danh sách" (Add to Watchlist)
   - Trailer section (YouTube iframe embed)
   - Cast section (12 actors với profile photos)
   - Similar movies section (6 movies grid)
   - Error handling + loading states
   - Responsive design (mobile-first)

3. **SearchPage.tsx** ✅
   - Search query từ URL params (?q=...)
   - Search results grid
   - Pagination controls (Previous/Next)
   - Empty state handling
   - Loading spinner
   - Error handling

4. **GenrePage.tsx** ✅
   - Genre ID từ URL params (/genre/:id)
   - Genre name display
   - Movies grid filtered by genre
   - Pagination controls
   - Total results count
   - Loading + error states

5. **WatchlistPage.tsx** ✅
   - Placeholder skeleton page
   - Lock icon + message
   - "Cần đăng nhập để xem danh sách"
   - "Tính năng xác thực sẽ được triển khai trong Phase 2"
   - Consistent styling với các page khác

**Components đã update**:

1. **Header.tsx** ✅
   - Logo (NiePhim) link to home
   - Desktop navigation menu:
     - Trang Chủ (/)
     - Phim (/search)
     - Danh Sách Của Tôi (/watchlist)
   - Search form:
     - Input field với icon
     - Submit navigates to /search?q={query}
   - Mobile hamburger menu:
     - Animated toggle (Menu ↔ X icon)
     - Mobile search form
     - Mobile navigation links
     - Close on link click
   - Active route highlighting (orange-500)
   - Sticky header (z-50)
   - Backdrop blur effect

2. **MovieCard.tsx** ✅
   - Wrapped với React Router Link
   - Link to `/movie/${id}`
   - Hover effects:
     - Scale animation (hover:scale-110)
     - Play button overlay
     - Title slide up animation
   - Quality badge (top-left)
   - Type badge (top-right)
   - Gradient overlay on hover
   - Responsive aspect ratio (2/3)

**App.tsx Structure** ✅:
```tsx
<BrowserRouter>
  <Header />  // Sticky header, visible on all pages
  <main>
    <Routes>
      <Route path="/" element={<HomePageTMDB />} />
      <Route path="/movie/:id" element={<MovieDetailPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/genre/:id" element={<GenrePage />} />
      <Route path="/watchlist" element={<WatchlistPage />} />
    </Routes>
  </main>
  <Footer />  // Footer, visible on all pages
</BrowserRouter>
```

### Build Status ✅

**TypeScript Compilation**: PASSED ✅
```
tsc -b → No errors
```

**Production Build**: SUCCESSFUL ✅
```
vite build
✓ 1729 modules transformed
dist/index.html                  0.45 kB │ gzip:  0.29 kB
dist/assets/index-CIhPSbUG.css  25.77 kB │ gzip:  5.17 kB
dist/assets/index-DL-DRZj-.js  266.39 kB │ gzip: 82.34 kB
✓ built in 6.65s
```

**Dev Server**: RUNNING ✅
```
vite
Local: http://localhost:5173/
```

**Fixed Issues (Phase 1 + Phase 2)**:
- ✅ TypeScript `verbatimModuleSyntax` errors (import type)
- ✅ Error type handling in pages (Error vs string)
- ✅ Unused variables in useAuth.ts
- ✅ Database field mapping in supabase.service.ts (watch_position → watchPosition)
- ✅ useWatchlist import statement (import * as SupabaseService)

**Latest Build (Phase 2 Complete)**:
```
vite build
✓ 1776 modules transformed
dist/index.html                  0.45 kB │ gzip:   0.29 kB
dist/assets/index-BZU5fKHf.css  27.83 kB │ gzip:   5.48 kB
dist/assets/index-WbPdd6Q5.js  459.43 kB │ gzip: 130.94 kB
✓ built in 33.85s
```

---

## ✅ PHASE 2: Authentication & User Features (HOÀN THÀNH)

### Week 3: Authentication System ✅

**Đã hoàn thành**:
- [x] Tạo Login/Register pages với validation
- [x] Implement Supabase Auth đầy đủ
- [x] Protected routes (ProtectedRoute component)
- [x] User profile page với stats
- [x] Logout functionality
- [x] Session persistence (Supabase tự động)
- [x] AuthProvider context
- [x] Error handling & loading states

**Files đã tạo**:
```
user/src/pages/
├── LoginPage.tsx               ✅ Login form với redirect
├── RegisterPage.tsx            ✅ Register form với validation
└── ProfilePage.tsx             ✅ User profile với stats

user/src/contexts/
└── AuthContext.tsx             ✅ Auth provider

user/src/components/
└── ProtectedRoute.tsx          ✅ Route guard
```

**Auth Flow** (Đã implement):
```
1. User clicks "Đăng nhập" in Header ✅
2. Redirect to /login ✅
3. Login với Supabase Auth ✅
4. Store session trong localStorage (Supabase auto) ✅
5. Redirect về trang trước đó ✅
6. Update Header (show user avatar/dropdown) ✅
```

### Week 4: User Interactions ✅

**Watchlist Feature** ✅:
- [x] Connect WatchlistPage với useWatchlist hook
- [x] Smart Watchlist button trong MovieDetailPage (3 states)
- [x] Add to Watchlist functionality
- [x] Remove from Watchlist functionality
- [x] Display watchlist movies grid (responsive)
- [x] Empty state design với icon
- [x] Loading state với spinner
- [x] Error state với message
- [x] Movie count display
- [x] Remove button on hover (heart icon)

**Watch History**:
- [ ] Track video playback progress
- [ ] "Continue Watching" section trong Homepage
- [ ] Resume từ vị trí đã xem
- [ ] Clear history option

**Rating & Reviews**:
- [ ] Rating stars component (1-10 stars)
- [ ] Review textarea trong MovieDetailPage
- [ ] Display user ratings
- [ ] Edit/delete own ratings

**Comments**:
- [ ] Comment form trong MovieDetailPage
- [ ] Display comments list
- [ ] Reply to comments
- [ ] Like/unlike comments
- [ ] Delete own comments

**Files cần tạo**:
```
user/src/components/user/
├── WatchlistButton.tsx         # Add/Remove watchlist
├── RatingStars.tsx             # Star rating input
├── ReviewForm.tsx              # Review textarea
├── CommentList.tsx             # Comments display
├── CommentForm.tsx             # Comment input
└── ContinueWatching.tsx        # Continue watching carousel
```

---

## 🎥 PHASE 3: Video Player & Streaming (Tuần 5-6)

### Video Player Component

**Requirements**:
- [ ] HLS/DASH video playback support
- [ ] Multiple quality selection (360p, 720p, 1080p, 4K)
- [ ] Resume playback từ watch_history
- [ ] Episode navigation (for series)
- [ ] Subtitle support (.srt, .vtt)
- [ ] Fullscreen mode
- [ ] Keyboard shortcuts:
  - Space: Play/Pause
  - Arrow Left/Right: Seek ±10s
  - Arrow Up/Down: Volume ±10%
  - F: Fullscreen
  - M: Mute
- [ ] Volume control
- [ ] Playback speed control (0.5x - 2x)
- [ ] Picture-in-Picture mode
- [ ] Loading spinner
- [ ] Error handling

**Library Options**:
- Video.js (recommended)
- Plyr
- React Player

**Files cần tạo**:
```
user/src/components/player/
├── VideoPlayer.tsx             # Main player component
├── QualitySelector.tsx         # Quality switcher
├── SubtitleSelector.tsx        # Subtitle switcher
├── EpisodeNavigation.tsx       # Next/Previous episode
├── PlaybackControls.tsx        # Play/Pause/Seek
└── VolumeControl.tsx           # Volume slider

user/src/pages/
└── WatchPage.tsx               # Video watching page
```

**WatchPage Layout**:
```
┌─────────────────────────────┐
│     Video Player (16:9)     │
│                             │
└─────────────────────────────┘
┌─────────────────────────────┐
│ Movie Title                 │
│ Description                 │
│ [Quality: HD] [Sub: VI]     │
└─────────────────────────────┘
┌─────────────────────────────┐
│ Episodes (for series)       │
│ Ep 1 | Ep 2 | Ep 3 | ...    │
└─────────────────────────────┘
┌─────────────────────────────┐
│ Comments Section            │
└─────────────────────────────┘
```

### Watch History Tracking

**Auto-save progress**:
- [ ] Save watch position mỗi 10 giây
- [ ] Save vào `watch_history` table:
  ```sql
  {
    user_id,
    movie_id,
    episode_id (nullable),
    watch_position (seconds),
    duration (total seconds),
    progress (percentage),
    last_watched_at
  }
  ```

**Continue Watching**:
- [ ] Query watch_history (chưa xem hết)
- [ ] Display trong Homepage carousel
- [ ] Progress bar trên MovieCard
- [ ] Resume button

---

## 📋 PHASE 4: Additional Pages & Features (Tuần 7-8)

### More Listing Pages

**MoviesPage.tsx** (Phim lẻ):
- [ ] Filter by:
  - Genre (dropdown)
  - Year (dropdown)
  - Country (dropdown)
  - Rating (slider)
- [ ] Sort by:
  - Popularity
  - Rating
  - Release date
  - Title (A-Z)
- [ ] Infinite scroll hoặc pagination
- [ ] Grid/List view toggle

**SeriesPage.tsx** (Phim bộ):
- [ ] Same filters như MoviesPage
- [ ] Display số tập (episodes count)
- [ ] Status badge (Đang chiếu / Hoàn thành)

**CountryPage.tsx**:
- [ ] Movies by country/region
- [ ] Country flag icons
- [ ] Filter by genre within country

**YearPage.tsx**:
- [ ] Movies by year
- [ ] Timeline view (optional)
- [ ] Decade filter

### Advanced Search

**SearchPage.tsx enhancements**:
- [ ] Advanced filters sidebar:
  - Genre (multiple select)
  - Year range (từ-đến)
  - Rating (min-max)
  - Country
  - Sort options
- [ ] Search suggestions (autocomplete)
- [ ] Recent searches history
- [ ] Clear filters button

---

## 🔧 PHASE 5: Admin Panel (Tuần 9-10)

### Admin Routes

```
/admin/dashboard               # Analytics overview
/admin/movies                  # Movie management
/admin/movies/add              # Add new movie
/admin/movies/edit/:id         # Edit movie
/admin/users                   # User management
/admin/comments                # Comment moderation
/admin/analytics               # Detailed analytics
```

### Movie Management

**AddMoviePage.tsx**:
- [ ] TMDB search integration
- [ ] Select movie từ TMDB results
- [ ] Auto-fill metadata (title, poster, etc.)
- [ ] Add video URLs manually:
  - Quality options (360p, 720p, 1080p, 4K)
  - Video source URL
  - Subtitle files upload
- [ ] Add episodes (for series):
  - Episode number
  - Episode title
  - Video URLs
  - Air date
- [ ] Publish/Draft status
- [ ] Save to Supabase

**EditMoviePage.tsx**:
- [ ] Load existing movie data
- [ ] Edit metadata
- [ ] Update video URLs
- [ ] Add/remove episodes
- [ ] Delete movie

**MovieListPage.tsx** (Admin):
- [ ] Table view với columns:
  - Thumbnail
  - Title
  - Type (Movie/Series)
  - Status
  - Views
  - Rating
  - Created date
  - Actions (Edit/Delete)
- [ ] Search/filter
- [ ] Bulk actions
- [ ] Pagination

### User Management

**UserManagement.tsx**:
- [ ] User list table
- [ ] Search users
- [ ] User details:
  - Profile info
  - Watch history
  - Comments
  - Ratings
- [ ] Block/unblock user
- [ ] Delete user (with confirmation)

### Analytics Dashboard

**Dashboard.tsx**:
- [ ] Overview stats:
  - Total movies
  - Total users
  - Total views (today/week/month)
  - Top rated movies
- [ ] Charts:
  - Views over time (line chart)
  - Popular genres (pie chart)
  - User growth (area chart)
- [ ] Recent activity feed

---

## ⚡ PHASE 6: Optimization & Polish (Tuần 11-12)

### Performance Optimization

**Image Optimization**:
- [ ] Lazy loading images (Intersection Observer)
- [ ] Progressive image loading (blur-up)
- [ ] WebP format support
- [ ] Responsive images (srcset)
- [ ] CDN integration (optional)

**Code Splitting**:
- [ ] Route-based code splitting
- [ ] Component lazy loading
- [ ] Dynamic imports
- [ ] Bundle size optimization

**Caching**:
- [ ] React Query implementation:
  - Cache TMDB API responses (5 min)
  - Automatic refetch on window focus
  - Optimistic updates
- [ ] Service Worker (PWA - optional)
- [ ] LocalStorage caching

**API Optimization**:
- [ ] Debounce search input
- [ ] Pagination với cursor-based
- [ ] Prefetch data on hover (React Query)

### SEO & Meta Tags

**Meta Tags**:
- [ ] Dynamic `<title>` cho mỗi page
- [ ] Meta description
- [ ] Open Graph tags (Facebook, Twitter)
- [ ] JSON-LD structured data
- [ ] Canonical URLs

**Sitemap**:
- [ ] Generate XML sitemap
- [ ] Submit to Google Search Console
- [ ] robots.txt

### Mobile Optimization

**Responsive Design**:
- [ ] Mobile-first approach (đã có)
- [ ] Touch gestures support
- [ ] Swipe navigation
- [ ] Mobile video player controls

**PWA (Optional)**:
- [ ] Service Worker registration
- [ ] Web App Manifest
- [ ] Offline fallback page
- [ ] Install prompt

### Accessibility (a11y)

- [ ] Keyboard navigation
- [ ] ARIA labels
- [ ] Focus management
- [ ] Screen reader support
- [ ] Color contrast compliance (WCAG AA)
- [ ] Skip to content link

---

## 🎯 PRIORITY ORDER (Khuyến nghị)

### 🔥 URGENT (Build ngay):
1. ✅ TMDB API service
2. ✅ Movie Detail Page
3. ✅ Navigation & Routing
4. 🔜 Auth system (Login/Register)
5. 🔜 Video Player component
6. 🔜 Watchlist functionality

### 🚀 HIGH PRIORITY (Build sau):
7. Admin panel (add movies)
8. Watch history tracking
9. Rating & Comments
10. Search improvements
11. More listing pages

### 💎 NICE TO HAVE (Nếu còn thời gian):
12. AI recommendations
13. PWA support
14. Social sharing
15. Email notifications
16. Dark/Light theme toggle

---

## 📈 TIẾN ĐỘ HIỆN TẠI

### Đã hoàn thành (Phase 1): 100% ✅

- ✅ TMDB API Integration
- ✅ Custom Hooks (9 hooks)
- ✅ Supabase Service
- ✅ Auth Hooks (skeleton)
- ✅ Watchlist Hooks (skeleton)
- ✅ React Router Setup
- ✅ Header Navigation
- ✅ MovieCard Component
- ✅ 5 Pages:
  - ✅ HomePageTMDB
  - ✅ MovieDetailPage (HOÀN CHỈNH)
  - ✅ SearchPage
  - ✅ GenrePage
  - ✅ WatchlistPage (skeleton)

### Đang làm (Phase 2): 0%

- [ ] Authentication (Login/Register)
- [ ] User Profile
- [ ] Watchlist Implementation
- [ ] Watch History
- [ ] Rating & Comments

### Chưa bắt đầu: Phase 3-6

---

## 🛠️ TECHNICAL STACK SUMMARY

### Frontend
- ✅ React 19.2.0
- ✅ TypeScript 5.9.3
- ✅ Vite 7.2.4
- ✅ Tailwind CSS 3.4.19
- ✅ React Router DOM 7.12.0
- ✅ Lucide React 0.562.0 (icons)
- 🔜 React Query (TanStack Query) - for caching
- 🔜 Zustand/Redux - for global state
- 🔜 Video.js/Plyr - video player

### Backend Integration
- ✅ Supabase (PostgreSQL + Auth + Storage)
- ✅ TMDB API (movie metadata)
- 🔜 Supabase Edge Functions (optional)

### Development Tools
- ✅ ESLint
- ✅ Git
- 🔜 React DevTools
- 🔜 Lighthouse (performance)

---

## 📁 CURRENT FILE STRUCTURE

```
d:\Đồ án\Đồ án Thực Tập\
├── user/                           # Frontend app
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx      ✅ Navigation + Search
│   │   │   │   └── Footer.tsx      ✅
│   │   │   ├── movie/
│   │   │   │   ├── MovieCard.tsx   ✅ Card với Link
│   │   │   │   ├── MovieSlider.tsx ✅
│   │   │   │   └── MovieGrid.tsx   ✅
│   │   │   └── ui/
│   │   │       ├── Button.tsx      ✅
│   │   │       └── LoadingSpinner.tsx ✅
│   │   ├── pages/
│   │   │   ├── HomePageTMDB.tsx    ✅
│   │   │   ├── MovieDetailPage.tsx ✅ HOÀN CHỈNH
│   │   │   ├── SearchPage.tsx      ✅
│   │   │   ├── GenrePage.tsx       ✅
│   │   │   └── WatchlistPage.tsx   ✅ Skeleton
│   │   ├── services/
│   │   │   ├── tmdb.service.ts     ✅ TMDB API
│   │   │   ├── supabase.service.ts ✅ User data
│   │   │   └── supabase.ts         ✅ Client
│   │   ├── hooks/
│   │   │   ├── useTMDB.ts          ✅ 9 hooks
│   │   │   ├── useAuth.ts          ✅ Auth hooks
│   │   │   └── useWatchlist.ts     ✅ Watchlist hooks
│   │   ├── types/
│   │   │   └── tmdb.types.ts       ✅ TypeScript types
│   │   ├── utils/
│   │   │   └── constants.ts        ✅ Constants
│   │   ├── App.tsx                 ✅ Router setup
│   │   └── main.tsx                ✅
│   ├── public/
│   ├── package.json                ✅
│   ├── vite.config.ts              ✅
│   ├── tsconfig.json               ✅
│   └── tailwind.config.js          ✅
├── admin/                          🔜 TIẾP THEO
├── .env                            ✅ API keys
├── PROJECT_OVERVIEW.md             ✅ Overview
├── QUICK_START.md                  ✅ Quick start
└── ROADMAP.md                      ✅ THIS FILE
```

---

## 🎓 LEARNING RESOURCES

### React 19 Features
- Server Components
- Actions & Transitions
- use() hook
- Suspense improvements

### TypeScript Best Practices
- Type safety
- Generic types
- Utility types (Partial, Pick, Omit)

### Performance Patterns
- Memoization (React.memo, useMemo, useCallback)
- Code splitting
- Lazy loading
- Virtual scrolling (for long lists)

---

## 📝 NOTES & CONVENTIONS

### Coding Standards
- ✅ TypeScript strict mode
- ✅ ESLint rules
- ✅ Component naming: PascalCase
- ✅ File naming: PascalCase for components, kebab-case for utils
- ✅ CSS: Tailwind utility-first

### Git Workflow (Khuyến nghị)
```bash
# Feature branches
git checkout -b feature/authentication
git checkout -b feature/video-player
git checkout -b feature/admin-panel

# Commit messages
git commit -m "feat: add login page"
git commit -m "fix: resolve video playback issue"
git commit -m "refactor: optimize TMDB service"
```

### Component Structure Template
```tsx
import React from 'react';

interface ComponentProps {
  // Props here
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Hooks
  // Event handlers
  // Helper functions

  return (
    // JSX
  );
};

export default Component;
```

---

## 🚀 NEXT IMMEDIATE STEPS

**Bạn nên bắt đầu với**:

1. **Authentication System** (Week 3):
   - Tạo LoginPage.tsx và RegisterPage.tsx
   - Implement Supabase Auth
   - Protected routes
   - Update Header với user state

2. **Video Player** (Week 5):
   - Research Video.js hoặc Plyr
   - Tạo VideoPlayer component
   - Implement basic playback
   - Add quality selection

3. **Admin Panel** (Week 9):
   - Setup admin routes
   - TMDB search integration
   - Add movie form
   - Video URL management

---

**Bạn muốn bắt đầu build phần nào tiếp theo?**
- A) Authentication System (Login/Register) 🔐
- B) Video Player Component 🎥
- C) Admin Panel (TMDB import) 👨‍💼
- D) Watchlist Implementation ⭐
- E) More Listing Pages (Movies, Series, Country) 📋
