# 🎬 PROJECT OVERVIEW - NiePhim

## 📋 Project Information

### Basic Information
- **Project Name**: NiePhim (Movie Streaming Platform)
- **Type**: Graduation Project (Đồ án Thực Tập)
- **Purpose**: Vietnamese movie streaming web application
- **Status**: In Development
- **Started**: January 2026

### Project Description
NiePhim là nền tảng xem phim trực tuyến với giao diện hiện đại kiểu Netflix, cho phép người dùng:
- Xem phim và series online
- Tìm kiếm và lọc phim theo thể loại, quốc gia, năm
- Thêm phim vào danh sách yêu thích (watchlist)
- Theo dõi lịch sử xem phim
- Đánh giá và review phim

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19.2.0
- **Language**: TypeScript 5.9.3
- **Build Tool**: Vite 7.3.1
- **Styling**: Tailwind CSS 3.4.19
- **Routing**: React Router DOM 7.12.0
- **Icons**: Lucide React 0.562.0
- **State Management**: React Hooks + Context API

### Backend & Services
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Movie Data API**: TMDB (The Movie Database)
- **Backend Server**: Express.js 5.2.1 (minimal, mostly using Supabase)

### Development Tools
- **Linter**: ESLint 9.39.1
- **Compiler**: SWC (@vitejs/plugin-react-swc)
- **CSS Processing**: PostCSS 8.5.6 + Autoprefixer 10.4.23

---

## 📁 Current File Structure

### Root Directory
```
d:\Đồ án\Đồ án Thực Tập\
├── user/                           # Frontend Application (React)
├── backend/                        # Backend Server (Express.js)
├── admin/                          # Admin Panel (Not started)
├── database/                       # Database migrations
│   └── migrations/
├── .git/                           # Git repository
├── PROJECT_OVERVIEW.md             # This file
├── ROADMAP.md                      # Development roadmap
├── ARCHITECTURE_COMPLETE.md        # Architecture documentation
├── TMDB_SETUP_GUIDE.md            # TMDB API setup guide
├── TMDB_HOOKS_GUIDE.md            # TMDB hooks usage guide
└── QUICK_START.md                 # Quick start guide
```

---

## 📂 User App Structure (Frontend)

### Complete Directory Tree
```
user/
├── public/                         # Static assets
│   └── vite.svg
│
├── src/
│   ├── components/                 # React components
│   │   ├── common/
│   │   │   └── index.ts           # Common exports
│   │   │
│   │   ├── layout/                # Layout components
│   │   │   ├── Header.tsx         # ✅ Nav + Search + User Menu (Phase 2)
│   │   │   ├── Footer.tsx         # ✅ Footer with links
│   │   │   └── layout.tsx         # Main layout wrapper
│   │   │
│   │   ├── ProtectedRoute.tsx     # ✅ Route guard (Phase 2)
│   │   │
│   │   ├── movie/                 # Movie-related components
│   │   │   ├── MovieCard.tsx      # ✅ Movie card với Link navigation
│   │   │   ├── MovieGrid.tsx      # ✅ Grid layout for movies
│   │   │   ├── MovieSlider.tsx    # ✅ Slider component
│   │   │   └── VideoPlayer.tsx    # ✅ Enhanced video player (Phase 3)
│   │   │
│   │   └── ui/                    # Reusable UI components
│   │       ├── Breadcrumb.tsx     # Breadcrumb navigation
│   │       ├── Button.tsx         # ✅ Reusable button
│   │       ├── CategoryBadge.tsx  # Category badge
│   │       ├── Filter.tsx         # Filter component
│   │       ├── LoadingSpinner.tsx # ✅ Loading spinner
│   │       ├── Pagination.tsx     # Pagination component
│   │       ├── SearchBar.tsx      # Search with suggestions
│   │       ├── SectionTitle.tsx   # Section header
│   │       └── Slider.tsx         # ✅ Hero slider/carousel
│   │
│   ├── data/                      # Static data
│   │   └── mockData.ts            # Mock movie data for demo
│   │
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAuth.ts             # ✅ Authentication hooks (3 hooks)
│   │   ├── useTMDB.ts             # ✅ TMDB API hooks (9 hooks)
│   │   ├── useWatchlist.ts        # ✅ Watchlist management hooks (2 hooks)
│   │   └── useWatchHistory.ts     # ✅ Watch history tracking (Phase 3)
│   │
│   ├── lib/                       # External library configs
│   │   └── supabase.ts            # ✅ Supabase client setup
│   │
│   ├── pages/                     # Page components
│   │   ├── HomePage.tsx           # ✅ Homepage with TMDB data (consolidated)
│   │   ├── MovieDetailPage.tsx    # ✅ Movie details + Watchlist (HOÀN CHỈNH)
│   │   ├── WatchPage.tsx          # ✅ Video player page (Phase 3)
│   │   ├── SearchPage.tsx         # ✅ Search results + pagination
│   │   ├── GenrePage.tsx          # ✅ Movies by genre + pagination
│   │   ├── WatchlistPage.tsx      # ✅ Real watchlist (Phase 2)
│   │   ├── LoginPage.tsx          # ✅ Login form (Phase 2)
│   │   ├── RegisterPage.tsx       # ✅ Register form (Phase 2)
│   │   ├── ProfilePage.tsx        # ✅ User profile (Phase 2)
│   │   └── TestTMDBPage.tsx       # TMDB API test page
│   │
│   ├── services/                  # Service layer
│   │   ├── supabase.service.ts    # ✅ Supabase operations (14 functions)
│   │   └── tmdb.service.ts        # ✅ TMDB API wrapper (20+ functions)
│   │
│   ├── types/                     # TypeScript type definitions
│   │   ├── SupabaseClients.ts     # Supabase types
│   │   └── tmdb.types.ts          # ✅ TMDB API types (comprehensive)
│   │
│   ├── utils/                     # Utility functions
│   │   └── constants.ts           # ✅ App constants (TMDB_CONFIG, GENRES, etc.)
│   │
│   ├── contexts/                  # React contexts
│   │   └── AuthContext.tsx        # ✅ Auth provider (Phase 2)
│   │
│   ├── App.tsx                    # ✅ Main app với AuthProvider + Routes
│   ├── main.tsx                   # React DOM entry point
│   ├── App.css                    # App-specific styles
│   ├── index.css                  # Global styles + Tailwind imports
│   └── vite-env.d.ts              # Vite type declarations
│
├── .env                           # Environment variables
├── .gitignore                     # Git ignore rules
├── eslint.config.js               # ESLint configuration
├── index.html                     # HTML entry point
├── package.json                   # Dependencies & scripts
├── package-lock.json              # Lock file
├── postcss.config.js              # PostCSS configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.app.json              # TypeScript config for app
├── tsconfig.json                  # Base TypeScript config
├── tsconfig.node.json             # TypeScript config for build tools
└── vite.config.ts                 # Vite configuration
```

---

## 🗄️ Backend Structure

### Backend Directory
```
backend/
├── node_modules/                   # Dependencies
├── package.json                    # Backend dependencies
├── package-lock.json               # Lock file
└── server.js                       # Express server (minimal)
```

**Note**: Backend hiện tại minimal vì chủ yếu dùng Supabase Edge Functions và TMDB API.

---

## 🗂️ Database Structure

### Admin Directory
```
admin/
└── (empty - not started yet)
```

### Database Migrations
```
database/
└── migrations/
    └── 001_cleanup_database.sql    # Database optimization script
```

---

## 🎯 Current Implementation Status

### ✅ PHASE 1 COMPLETED (100%)

#### 1. **UI Components Library** ✅
- [x] Layout (Header, Footer)
- [x] Movie components (MovieCard, MovieGrid, MovieSlider)
- [x] UI components (Slider, SearchBar, Filter, Pagination, LoadingSpinner, etc.)
- [x] Netflix-style dark theme
- [x] Fully responsive design (mobile-first)

#### 2. **TMDB API Integration** ✅
- [x] TMDB service với 20+ functions
- [x] 9 custom React hooks for data fetching
- [x] TypeScript types cho TMDB API responses
- [x] Image URL builders (poster, backdrop, profile)
- [x] Utility methods (getTrailer, getDirector, formatRating, formatRuntime)
- [x] Test page cho API verification
- [x] Error handling & loading states

#### 3. **Services Layer** ✅
- [x] TMDB Service (fetch movie metadata from API)
  - getTMDBMovie, searchTMDBMovies, getPopularMovies
  - getTrendingMovies, getMoviesByGenre, getSimilarMovies
  - getTMDBCredits, getTMDBVideos, getMovieGenres
- [x] Supabase Service (user data operations)
  - Watchlist: addToWatchlist, removeFromWatchlist, getWatchlist
  - Watch History: addToHistory, getWatchHistory, getWatchProgress
  - Ratings: addRating, getUserRating, getMovieRatings
- [x] Constants and utilities (TMDB_CONFIG, GENRES, ROUTES, MESSAGES)
- [x] Comprehensive error handling

#### 4. **Hooks Layer** ✅
- [x] useAuth - Authentication hooks (signIn, signUp, signOut)
- [x] useTMDB - 9 hooks cho TMDB data:
  - useMovieDetails, useMovieSearch, usePopularMovies
  - useTrendingMovies, useMoviesByGenre, useMovieGenres
  - useSimilarMovies, useMovieVideos, useMovieCredits
- [x] useWatchlist - Watchlist management (add, remove, toggle, check)
- [x] useIsInWatchlist - Lightweight watchlist check

#### 5. **Routing & Navigation** ✅
- [x] React Router v7.12.0 installed & configured
- [x] BrowserRouter setup trong App.tsx
- [x] Header component với navigation:
  - Desktop navigation menu (Trang Chủ, Phim, Danh Sách Của Tôi)
  - Mobile hamburger menu với slide animation
  - Search form với real-time navigation
  - Active route highlighting (orange-500)
  - Sticky header với backdrop blur
- [x] Route configuration (8 routes):
  - / → HomePageTMDB
  - /movie/:id → MovieDetailPage
  - /search → SearchPage (with ?q= query param)
  - /genre/:id → GenrePage
  - /login → LoginPage
  - /register → RegisterPage
  - /profile → ProfilePage (protected)
  - /watchlist → WatchlistPage (protected)
- [x] MovieCard updated với Link navigation
- [x] ProtectedRoute wrapper cho authenticated pages

#### 6. **Pages** ✅
- [x] **HomePageTMDB** - Homepage với TMDB data
  - Hero slider với trending movies
  - Popular movies section
  - Trending movies section
  - Responsive grid layout

- [x] **MovieDetailPage** - Chi tiết phim đầy đủ (HOÀN CHỈNH + WATCHLIST)
  - Hero section với backdrop image + gradient overlays
  - Movie info grid:
    - Poster image (w500)
    - Rating với stars (TMDB vote_average)
    - Release year, runtime (formatted)
    - Age rating badge (18+)
    - Genres với clickable links
    - Director name
    - Overview/description
  - Action buttons:
    - "Xem Ngay" button (red-600)
    - **Smart Watchlist Button** (Phase 2):
      - Not logged in: "Đăng nhập để thêm" → navigates to /login
      - Not in watchlist: "+ Thêm vào Danh sách" (gray-800)
      - In watchlist: "✓ Đã thêm vào Danh sách" (green-600)
      - Loading state while adding/removing
  - Trailer section (YouTube iframe embed)
  - Cast section (12 actors với profile photos)
  - Similar movies section (6 movies grid)
  - Loading states, error handling
  - Fully responsive design

- [x] **SearchPage** - Tìm kiếm + pagination
  - Query từ URL params (?q=...)
  - Search results grid (2-6 columns responsive)
  - Pagination controls (Previous/Next buttons)
  - Total results count display
  - Empty state ("Không tìm thấy kết quả nào")
  - Empty query state
  - Loading spinner
  - Error handling

- [x] **GenrePage** - Lọc theo thể loại + pagination
  - Genre ID từ URL params (/genre/:id)
  - Genre name display (from useMovieGenres)
  - Movies grid filtered by genre
  - Pagination controls
  - Total results count
  - Loading + error states
  - Responsive grid (2-6 columns)

- [x] **WatchlistPage** - Fully Functional (Phase 2 Connected)
  - Connected to useWatchlist hook
  - Fetch movie_ids from Supabase + metadata from TMDB
  - Loading state với spinner
  - Error state với error message
  - Empty state với icon + "Khám phá phim" button
  - Movies grid (2-6 columns responsive)
  - Remove button on hover (heart icon)
  - Movie count display
  - Protected route (requires login)

- [x] **LoginPage** - Authentication Form (Phase 2)
  - Email and password inputs
  - Form validation
  - Loading state during auth
  - Error message display
  - Link to register page
  - Redirect to original page after login
  - Centered card with branding

- [x] **RegisterPage** - Registration Form (Phase 2)
  - Full name, email, password, confirm password
  - Password matching validation
  - Minimum password length (6 chars)
  - Success message after registration
  - Auto-redirect to login (3 seconds)
  - Link to login page
  - Consistent styling

- [x] **ProfilePage** - User Profile (Phase 2)
  - User avatar (first letter of email)
  - Display email and full name
  - Member since date
  - User ID display
  - Stats section (watchlist, ratings, watch time)
  - Logout button
  - Placeholder for future settings
  - Protected route

#### 7. **Build & Deployment** ✅
- [x] TypeScript compilation: PASSED (no errors)
- [x] Production build: SUCCESSFUL
  - Build size: 459 KB (gzipped: 130 KB) - Phase 2 complete
  - CSS: 27.83 KB (gzipped: 5.48 KB)
  - Build time: ~33.85s
- [x] Dev server: Running on http://localhost:5173
- [x] Fixed all TypeScript verbatimModuleSyntax errors
- [x] Fixed Error type handling trong pages
- [x] Fixed unused variables warnings
- [x] Fixed database field mapping issues
- [x] Fixed useWatchlist import statement (Phase 2)

---

### ✅ PHASE 2: COMPLETED (100%)

#### 1. **Authentication System** ✅
- [x] Login/Register pages với validation đầy đủ
- [x] Supabase Auth implementation hoàn chỉnh
- [x] Protected routes (ProtectedRoute component)
- [x] User profile page với stats
- [x] Session management tự động (Supabase)
- [x] AuthProvider context
- [x] Error handling & loading states

**Files Created:**
- ✅ [src/pages/LoginPage.tsx](user/src/pages/LoginPage.tsx) - Login form với redirect
- ✅ [src/pages/RegisterPage.tsx](user/src/pages/RegisterPage.tsx) - Registration form
- ✅ [src/pages/ProfilePage.tsx](user/src/pages/ProfilePage.tsx) - User profile
- ✅ [src/contexts/AuthContext.tsx](user/src/contexts/AuthContext.tsx) - Auth provider
- ✅ [src/components/ProtectedRoute.tsx](user/src/components/ProtectedRoute.tsx) - Route guard

#### 2. **User Features** ✅
- [x] Watchlist implementation (fully connected to UI)
- [x] Add/Remove from watchlist
- [x] Watchlist page với real data
- [x] Empty state, loading state, error state
- [x] User menu trong Header (desktop + mobile)
- [x] Profile stats (placeholder for counts)

**Files Updated:**
- ✅ [src/App.tsx](user/src/App.tsx) - Added auth routes + AuthProvider
- ✅ [src/components/layout/Header.tsx](user/src/components/layout/Header.tsx) - User menu dropdown
- ✅ [src/pages/MovieDetailPage.tsx](user/src/pages/MovieDetailPage.tsx) - Watchlist button
- ✅ [src/pages/WatchlistPage.tsx](user/src/pages/WatchlistPage.tsx) - Real data connection
- ✅ [src/hooks/useWatchlist.ts](user/src/hooks/useWatchlist.ts) - Fixed imports

**Features Implemented:**
- ✅ Smart watchlist button (3 states: login/add/added)
- ✅ User avatar với first letter
- ✅ Dropdown menu với Profile, Watchlist, Logout
- ✅ Mobile menu integration
- ✅ Click outside to close dropdown
- ✅ Remove from watchlist on hover
- ✅ Real-time UI updates

#### 3. **Future User Features** ⏳
- [ ] Rating & review system
- [ ] Comment system

---

### 🚧 PHASE 3: IN PROGRESS (Video Player & Watch History)

#### 1. **Video Player** ✅
- [x] Install react-player library
- [x] Enhanced VideoPlayer component with features:
  - Play/pause, volume, seek controls
  - Fullscreen toggle
  - Quality selector (placeholder)
  - Playback speed control (0.5x - 2x)
  - Keyboard shortcuts (Space, K, M, F, Arrow keys)
  - Auto-hide controls on inactivity
  - Resume from saved position
- [x] WatchPage for full-screen video viewing

#### 2. **Watch History** ✅
- [x] useWatchHistory hook (fetches history + TMDB metadata)
- [x] useMovieProgress hook (auto-save every 10 seconds)
- [x] Track watch progress (debounced saving to Supabase)
- [x] Continue Watching section on HomePage
- [x] Resume playback from saved position (initialProgress prop)

#### 3. **Bug Fixes** ✅
- [x] Fixed Header/Footer duplication bug (removed Layout wrapper from HomePage)

**Files Created/Updated (Phase 3):**
- ✅ [src/components/movie/VideoPlayer.tsx](user/src/components/movie/VideoPlayer.tsx) - Enhanced with react-player
- ✅ [src/hooks/useWatchHistory.ts](user/src/hooks/useWatchHistory.ts) - Watch history hook
- ✅ [src/pages/WatchPage.tsx](user/src/pages/WatchPage.tsx) - Video player page
- ✅ [src/pages/HomePage.tsx](user/src/pages/HomePage.tsx) - Fixed Layout bug, consolidated

---

### ⏳ Planned Features

#### 1. **Admin Panel** (Phase 4)
- [ ] Movie management
- [ ] User management
- [ ] Analytics dashboard

#### 2. **Future Enhancements** (Phase 5)
- [ ] Rating & review system
- [ ] Comment system
- [ ] PWA support
- [ ] AI recommendations

---

## 🏗️ Architecture

### Hybrid Architecture Approach

**Philosophy**:
- TMDB API = Source of truth for movie metadata (không lưu DB)
- Supabase = User data only (watchlist, history, ratings)
- Lightweight database (chỉ lưu movie_id references)

### Data Flow

#### Displaying Movies:
```
Component → useTMDB hook → TMDB Service → TMDB API → Display
```

#### User Interactions:
```
User clicks "Add to Watchlist"
→ useWatchlist hook
→ Supabase Service
→ INSERT (user_id, movie_id) vào table favorites
→ Update UI
```

#### Watchlist Page:
```
Load page
→ Fetch movie_ids from Supabase
→ Fetch metadata từ TMDB cho mỗi movie_id
→ Display với fresh data
```

**Benefits**:
- ✅ Always up-to-date movie info
- ✅ No stale data
- ✅ Lightweight database
- ✅ Easy to maintain

---

## 📊 Database Schema (Supabase)

### Current Tables (14 tables)

#### Core Tables:
1. **profiles** - User accounts
2. **favorites** - User watchlist (user_id + movie_id)
3. **watch_history** - Watch progress
4. **ratings** - User ratings & reviews
5. **comments** - User comments
6. **comment_likes** - Comment likes

#### Content Tables:
7. **movies** - Movie info (minimal, mostly unused)
8. **episodes** - Series episodes
9. **video_qualities** - Video quality variants
10. **genres** - Movie genres
11. **movie_genres** - Movie-genre mapping
12. **countries** - Countries list

#### AI Features:
13. **ai_recommendations** - AI movie recommendations
14. **ai_chat_history** - Chatbot history

**Note**: `movies` table không lưu full metadata, chỉ lưu movie_id khi cần. TMDB là source of truth.

---

## 🔧 Configuration Files

### Environment Variables (.env)
```env
# Supabase
VITE_SUPABASE_URL=https://cbritkburuyzjhensgil.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_KiWlEyLPakKTMooOoy4Swg_soy8hzds

# TMDB API
VITE_TMDB_API_KEY=e5c558b8e47fd35ed2e2fb5b3e997b1a
VITE_TMDB_BASE_URL=https://api.themoviedb.org/3
VITE_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p
```

### Key Config Files:
- **vite.config.ts** - Vite bundler config
- **tsconfig.json** - TypeScript config
- **tailwind.config.js** - Tailwind CSS config
- **eslint.config.js** - Code linting rules
- **package.json** - Dependencies and scripts

---

## 🚀 Development Commands

### Frontend (user/)
```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint
```

### Backend (backend/)
```bash
# Install dependencies
npm install

# Start server
npm start
```

---

## 📝 Available Scripts (package.json)

### User App Scripts:
```json
{
  "dev": "vite",              // Start dev server (localhost:5173)
  "build": "tsc -b && vite build",  // Build production
  "lint": "eslint .",         // Run ESLint
  "preview": "vite preview"   // Preview production build
}
```

---

## 🎨 Design System

### Color Palette:
- **Primary**: Orange (#ff9500)
- **Background**: Black (#000000)
- **Surface**: Gray-900 (#111827)
- **Text**: White (#ffffff)
- **Accent**: Red (#ef4444) for watchlist hearts

### Typography:
- **Font**: System font stack (Tailwind default)
- **Sizes**: Responsive (text-sm to text-7xl)

### Components Style:
- **Cards**: Hover scale effect (110%)
- **Buttons**: Rounded, gradient or solid
- **Layout**: Padding px-4 → px-16 (responsive)
- **Spacing**: Space-y-16 for sections

---

## 📦 Dependencies Overview

### Main Dependencies:
```json
{
  "react": "19.2.0",
  "react-dom": "19.2.0",
  "react-router-dom": "7.12.0",
  "@supabase/supabase-js": "2.91.0",
  "lucide-react": "0.562.0",
  "react-player": "2.x"
}
```

### Dev Dependencies:
```json
{
  "typescript": "5.9.3",
  "vite": "7.2.4",
  "tailwindcss": "3.4.19",
  "eslint": "9.39.1",
  "@vitejs/plugin-react-swc": "3.5.0"
}
```

---

## 🔗 External APIs & Services

### 1. TMDB API
- **Purpose**: Movie metadata (titles, posters, cast, etc.)
- **Base URL**: https://api.themoviedb.org/3
- **API Key**: Stored in .env
- **Rate Limit**: 40 requests per 10 seconds
- **Language**: vi-VN (Vietnamese)

### 2. Supabase
- **Purpose**: Database, Authentication, Storage
- **URL**: https://cbritkburuyzjhensgil.supabase.co
- **Features Used**:
  - PostgreSQL database
  - Auth (email/password)
  - Row Level Security (RLS)

---

## 📚 Documentation Files

### Available Guides:
1. **PROJECT_OVERVIEW.md** (this file) - Project overview
2. **ROADMAP.md** - Development roadmap
3. **ARCHITECTURE_COMPLETE.md** - Architecture details
4. **TMDB_SETUP_GUIDE.md** - TMDB API setup
5. **TMDB_HOOKS_GUIDE.md** - Hooks usage guide
6. **QUICK_START.md** - Quick start guide

---

## 🎯 Next Immediate Steps

### ✅ Priority 1: Routing & Navigation (COMPLETED)
1. ✅ Setup React Router v7.12.0
2. ✅ Create Header component với navigation
3. ✅ Configure routes cho 5 pages

### ✅ Priority 2: Movie Detail Page (COMPLETED)
1. ✅ Create MovieDetailPage component
2. ✅ Fetch movie details, cast, videos from TMDB
3. ✅ Display trailer, cast, similar movies
4. ✅ Hero section với backdrop
5. ✅ Action buttons (Watch Now, Add to Watchlist)

### 🔜 Priority 3: Authentication (NEXT - Phase 2)
1. [ ] Setup AuthProvider với Supabase Auth
2. [ ] Create Login/Register pages
3. [ ] Protect watchlist routes
4. [ ] User profile page
5. [ ] Session management

### 🔜 Priority 4: Watchlist Feature (Phase 2)
1. [ ] Connect useWatchlist hook to WatchlistPage
2. [ ] Add watchlist button to MovieDetailPage
3. [ ] Implement add/remove functionality
4. [ ] Display watchlist movies grid
5. [ ] Empty state design

### 🔜 Priority 5: Video Player (Phase 3)
1. [ ] Choose video player library (Video.js/Plyr)
2. [ ] Create VideoPlayer component
3. [ ] Multiple quality selection
4. [ ] Resume playback từ watch_history
5. [ ] Episode navigation (for series)

---

## 👥 Team

- **Developer**: Duongken24
- **Role**: Full-stack Developer
- **Project Type**: Individual graduation project

---

## 📞 Contact & Resources

### Project Links:
- **GitHub**: (Add if applicable)
- **TMDB Account**: https://www.themoviedb.org/u/Duongken24
- **Supabase Project**: https://supabase.com/dashboard

### External Resources:
- **TMDB API Docs**: https://developers.themoviedb.org/3
- **Supabase Docs**: https://supabase.com/docs
- **React Docs**: https://react.dev
- **Tailwind CSS Docs**: https://tailwindcss.com/docs

---

## 📝 Notes

### Important Decisions:
1. **No full movie storage in DB** - TMDB is source of truth
2. **User data only in Supabase** - Watchlist, history, ratings
3. **Lightweight references** - Only store movie_id (TMDB ID)
4. **Netflix-style UI** - Dark theme, modern design
5. **Vietnamese language** - Primary audience is Vietnamese users

### Known Issues:
- [ ] TypeScript strict mode warnings (non-critical)
- [ ] Some components need optimization
- [ ] Video URLs need to be added manually (TMDB doesn't provide)
- [x] ~~Header/Footer duplication~~ - FIXED (removed Layout wrapper from HomePage)

### Future Enhancements:
- [ ] PWA support (offline capabilities)
- [ ] Social features (sharing, comments)
- [ ] AI recommendations
- [ ] Mobile app (React Native)
- [ ] Admin panel for content management

---

---

## 📊 Progress Summary

### Overall Progress: ~70% Complete

**Phase 1** (Routing & Navigation): ✅ 100% DONE
- TMDB API Integration: ✅ Complete
- Services Layer: ✅ Complete
- Hooks Layer: ✅ Complete
- Routing Setup: ✅ Complete
- 5 Pages Created: ✅ Complete
- Build & Deployment: ✅ Successful

**Phase 2** (Authentication & User Features): ✅ 100% DONE
- Authentication: ✅ Complete (Login, Register, Protected Routes)
- Watchlist: ✅ Complete (Add, Remove, Display)
- User Profile: ✅ Complete
- User Menu: ✅ Complete (Desktop + Mobile)
- Session Management: ✅ Complete (Supabase)
- 3 New Pages Created: ✅ Complete
- 4 Files Updated: ✅ Complete
- Watch History: ⏳ Future (Phase 3)
- Rating & Comments: ⏳ Future (Phase 3)

**Phase 3** (Video Player & Watch History): ✅ 100% DONE
- Video Player Component: ✅ Complete (react-player)
- VideoPlayer Enhanced: ✅ Complete (controls, shortcuts, speed)
- useWatchHistory Hook: ✅ Complete
- WatchPage: ✅ Complete
- Continue Watching Section: ✅ Complete
- Watch Progress Tracking: ✅ Complete
- Build: ✅ Successful (503 KB main bundle)

**Phase 4** (Admin Panel): ⏳ 0% Not started

**Phase 5** (Optimization): ⏳ 0% Not started

---

## 🎉 Recent Accomplishments (Latest Session)

**Build Date**: January 22, 2026

### Phase 1 Accomplishments:
1. ✅ Complete TMDB API integration với 9 custom hooks
2. ✅ React Router v7 setup với 5 routes
3. ✅ MovieDetailPage - Full-featured movie detail page
4. ✅ SearchPage - Search results với pagination
5. ✅ GenrePage - Movies by genre với pagination
6. ✅ Header component - Navigation + Search + Mobile menu
7. ✅ Updated MovieCard - Link navigation với hover effects

### Phase 2 Accomplishments (NEW):
1. ✅ Complete Authentication System:
   - LoginPage với validation
   - RegisterPage với password matching
   - ProfilePage với user stats
   - ProtectedRoute component
   - AuthProvider context
   - Session management (Supabase)

2. ✅ Full Watchlist Features:
   - Smart watchlist button on MovieDetailPage (3 states)
   - WatchlistPage connected to real data
   - Add/Remove functionality
   - Empty state, loading state, error state
   - Real-time UI updates

3. ✅ User Menu Implementation:
   - Desktop dropdown menu (avatar + Profile + Watchlist + Logout)
   - Mobile menu integration
   - Click outside to close
   - Login/Register buttons when logged out

4. ✅ Updated Components:
   - Header.tsx - User menu + auth state
   - MovieDetailPage.tsx - Watchlist button
   - WatchlistPage.tsx - Real data connection
   - App.tsx - AuthProvider + new routes

### Build Quality:
- ✅ Zero TypeScript errors
- ✅ Production build successful (459 KB)
- ✅ Dev server running (http://localhost:5173)
- ✅ Fully responsive design (mobile-first)
- ✅ Error handling + loading states
- ✅ Clean code structure
- ✅ Supabase Auth integration working
- ✅ Protected routes functioning

---

## 🔧 Phase 3 Accomplishments (Current Session)

**Build Date**: January 23, 2026

### Bug Fixes:
1. ✅ **Header/Footer Duplication Bug FIXED**
   - **Problem**: Header và Footer xuất hiện 2 lần trên trang
   - **Root Cause**: HomePage.tsx sử dụng `<Layout>` component (chứa Header/Footer) trong khi App.tsx cũng đã có Header/Footer
   - **Solution**: Xóa Layout wrapper từ HomePage.tsx, thay bằng React Fragment `<>`
   - **Files Changed**: [src/pages/HomePage.tsx](user/src/pages/HomePage.tsx)

2. ✅ **File Consolidation**
   - Deleted: Old HomePage.tsx (mock data version)
   - Renamed: HomePageTMDB.tsx → HomePage.tsx
   - Updated App.tsx imports accordingly

### Video Player Implementation:
1. ✅ **Installed react-player** library
2. ✅ **Enhanced VideoPlayer Component** với:
   - React Player integration (supports MP4, YouTube, Vimeo, etc.)
   - Custom controls overlay (Netflix-style)
   - Play/Pause button (center + bottom)
   - Volume control với slider (expandable on hover)
   - Progress bar với seek functionality
   - Fullscreen toggle
   - Playback speed selector (0.5x - 2x)
   - Quality selector (placeholder - needs different video sources)
   - Keyboard shortcuts:
     - Space/K: Play/Pause
     - M: Mute/Unmute
     - F: Fullscreen
     - ←/→: Skip 10 seconds
     - ↑/↓: Volume control
   - Auto-hide controls after 3 seconds inactivity
   - Resume from saved position (initialProgress prop)
   - Progress callback for saving watch history
   - Vietnamese UI labels

3. ✅ **useWatchHistory Hook** (created structure)

### Phase 3 Complete Checklist:
- [x] Install react-player library
- [x] Create enhanced VideoPlayer component
- [x] Create useWatchHistory hook (with auto-save)
- [x] Create useMovieProgress hook (debounced saving)
- [x] Create WatchPage for full-screen video
- [x] Update MovieDetailPage "Xem Ngay" button → /watch/:id
- [x] Add Continue Watching section to HomePage
- [x] Create react-player TypeScript declaration
- [x] Build and verify (503 KB main bundle)

---

**Last Updated**: January 23, 2026 (Phase 3 Complete)
**Version**: 0.5.0 (Phase 3 Complete)
**Status**: Phase 1 ✅ Complete | Phase 2 ✅ Complete | Phase 3 ✅ Complete
