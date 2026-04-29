/**
 * Application Constants
 */

// Image Sizes
export const IMAGE_SIZES = {
  POSTER: {
    SMALL: 'w185',
    MEDIUM: 'w342',
    LARGE: 'w500',
    XLARGE: 'w780',
    ORIGINAL: 'original',
  },
  BACKDROP: {
    SMALL: 'w300',
    MEDIUM: 'w780',
    LARGE: 'w1280',
    ORIGINAL: 'original',
  },
  PROFILE: {
    SMALL: 'w45',
    MEDIUM: 'w185',
    LARGE: 'h632',
    ORIGINAL: 'original',
  },
};

// Pagination
export const PAGINATION = {
  MOVIES_PER_PAGE: 20,
  INITIAL_PAGE: 1,
  MAX_VISIBLE_PAGES: 5,
};

// Cache Configuration
export const CACHE_CONFIG = {
  ENABLED: true,
  TTL: 1000 * 60 * 30, // 30 minutes
  MAX_SIZE: 100, // Maximum cached items
};

// Request rate limits
export const RATE_LIMITS = {
  MAX_REQUESTS_PER_SECOND: 4,
  RETRY_DELAY: 1000, // 1 second
  MAX_RETRIES: 3,
};

// Movie genres lookup (legacy IDs)
export const GENRES = {
  ACTION: 28,
  ADVENTURE: 12,
  ANIMATION: 16,
  COMEDY: 35,
  CRIME: 80,
  DOCUMENTARY: 99,
  DRAMA: 18,
  FAMILY: 10751,
  FANTASY: 14,
  HISTORY: 36,
  HORROR: 27,
  MUSIC: 10402,
  MYSTERY: 9648,
  ROMANCE: 10749,
  SCIENCE_FICTION: 878,
  TV_MOVIE: 10770,
  THRILLER: 53,
  WAR: 10752,
  WESTERN: 37,
};

// Vietnamese Genre Names
export const GENRE_NAMES_VI: Record<number, string> = {
  28: 'Hành Động',
  12: 'Phiêu Lưu',
  16: 'Hoạt Hình',
  35: 'Hài',
  80: 'Tội Phạm',
  99: 'Tài Liệu',
  18: 'Chính Kịch',
  10751: 'Gia Đình',
  14: 'Giả Tưởng',
  36: 'Lịch Sử',
  27: 'Kinh Dị',
  10402: 'Âm Nhạc',
  9648: 'Bí Ẩn',
  10749: 'Lãng Mạn',
  878: 'Khoa Học Viễn Tưởng',
  10770: 'Truyền Hình',
  53: 'Gây Cấn',
  10752: 'Chiến Tranh',
  37: 'Viễn Tây',
};

// Movie Sort Options
export const SORT_OPTIONS = {
  POPULARITY_DESC: 'popularity.desc',
  POPULARITY_ASC: 'popularity.asc',
  RATING_DESC: 'vote_average.desc',
  RATING_ASC: 'vote_average.asc',
  RELEASE_DATE_DESC: 'release_date.desc',
  RELEASE_DATE_ASC: 'release_date.asc',
  TITLE_ASC: 'title.asc',
  TITLE_DESC: 'title.desc',
};

// Routes
export const ROUTES = {
  HOME: '/',
  MOVIE_DETAIL: '/movie/:id',
  SEARCH: '/search',
  WATCHLIST: '/watchlist',
  HISTORY: '/history',
  PROFILE: '/profile',
  LOGIN: '/login',
  REGISTER: '/register',
};

// Local Storage Keys
export const STORAGE_KEYS = {
  USER: 'niephim_user',
  THEME: 'niephim_theme',
  WATCHLIST_CACHE: 'niephim_watchlist_cache',
  HISTORY_CACHE: 'niephim_history_cache',
};

// Toast Messages
export const MESSAGES = {
  SUCCESS: {
    WATCHLIST_ADDED: 'Đã thêm vào danh sách yêu thích',
    WATCHLIST_REMOVED: 'Đã xóa khỏi danh sách yêu thích',
    RATING_ADDED: 'Đánh giá của bạn đã được lưu',
    LOGIN_SUCCESS: 'Đăng nhập thành công',
    LOGOUT_SUCCESS: 'Đăng xuất thành công',
  },
  ERROR: {
    GENERIC: 'Có lỗi xảy ra, vui lòng thử lại',
    NETWORK: 'Lỗi kết nối mạng',
    UNAUTHORIZED: 'Vui lòng đăng nhập để tiếp tục',
    NOT_FOUND: 'Không tìm thấy nội dung',
    RATE_LIMIT: 'Quá nhiều yêu cầu, vui lòng đợi',
  },
};

// Video Quality
export const VIDEO_QUALITY = {
  HD: 'HD',
  FULL_HD: 'Full HD',
  '4K': '4K',
  CAM: 'CAM',
  SD: 'SD',
};

// Watch Progress Thresholds
export const WATCH_THRESHOLDS = {
  CONSIDERED_WATCHED: 90, // % - Mark as watched if >= 90%
  CONTINUE_WATCHING: 5, // % - Show in continue watching if >= 5%
  UPDATE_INTERVAL: 10, // seconds - Update progress every 10 seconds
};

export default {
  IMAGE_SIZES,
  PAGINATION,
  CACHE_CONFIG,
  RATE_LIMITS,
  GENRES,
  GENRE_NAMES_VI,
  SORT_OPTIONS,
  ROUTES,
  STORAGE_KEYS,
  MESSAGES,
  VIDEO_QUALITY,
  WATCH_THRESHOLDS,
};
