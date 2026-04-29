// Mock data cho demo homepage

export interface Movie {
  id: number;
  title: string;
  image: string;
  quality: string;
  type: string;
  rating?: number;
  year?: number;
  description?: string;
}

export interface SlideData {
  id: string | number;
  title: string;
  description: string;
  image: string;
  rating?: number;
  year?: number;
}

// Slides cho banner chính
export const featuredSlides: SlideData[] = [
  {
    id: 1,
    title: "Oppenheimer",
    description: "Câu chuyện về J. Robert Oppenheimer, nhà vật lý lý thuyết người đã đóng vai trò quan trọng trong Dự án Manhattan - dự án phát triển vũ khí hạt nhân đầu tiên.",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1920&h=1080&fit=crop",
    rating: 8.5,
    year: 2023
  },
  {
    id: 2,
    title: "Dune: Part Two",
    description: "Paul Atreides hợp tác với Chani và những người Fremen để trả thù những kẻ đã phá hủy gia đình mình, đồng thời đối mặt với sự lựa chọn giữa tình yêu và số phận của vũ trụ.",
    image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=1920&h=1080&fit=crop",
    rating: 8.7,
    year: 2024
  },
  {
    id: 3,
    title: "The Batman",
    description: "Trong năm thứ hai làm vigilante, Batman khám phá tham nhũng ở Gotham City và những mối liên hệ của nó với gia đình mình trong khi đối đầu với kẻ giết người hàng loạt Riddler.",
    image: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1920&h=1080&fit=crop",
    rating: 7.9,
    year: 2022
  },
  {
    id: 4,
    title: "Guardians of the Galaxy Vol. 3",
    description: "Đội Guardians bắt đầu một nhiệm vụ nguy hiểm để bảo vệ một trong những thành viên của họ, một nhiệm vụ có thể dẫn đến sự kết thúc của đội nếu không thành công.",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1920&h=1080&fit=crop",
    rating: 8.1,
    year: 2023
  }
];

// Phim mới cập nhật
export const newMovies: Movie[] = [
  {
    id: 1,
    title: "Venom: The Last Dance",
    image: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 7.2,
    year: 2024
  },
  {
    id: 2,
    title: "Deadpool & Wolverine",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop",
    quality: "4K",
    type: "Phim lẻ",
    rating: 8.5,
    year: 2024
  },
  {
    id: 3,
    title: "Joker: Folie à Deux",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 7.8,
    year: 2024
  },
  {
    id: 4,
    title: "A Quiet Place: Day One",
    image: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 7.5,
    year: 2024
  },
  {
    id: 5,
    title: "Inside Out 2",
    image: "https://images.unsplash.com/photo-1594908900066-3f47337549d8?w=400&h=600&fit=crop",
    quality: "4K",
    type: "Phim lẻ",
    rating: 8.9,
    year: 2024
  },
  {
    id: 6,
    title: "Wicked",
    image: "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 8.2,
    year: 2024
  },
  {
    id: 7,
    title: "Gladiator II",
    image: "https://images.unsplash.com/photo-1512070679279-8988d32161be?w=400&h=600&fit=crop",
    quality: "4K",
    type: "Phim lẻ",
    rating: 8.0,
    year: 2024
  },
  {
    id: 8,
    title: "Moana 2",
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 7.6,
    year: 2024
  }
];

// Phim hot trong tuần
export const trendingMovies: Movie[] = [
  {
    id: 11,
    title: "The Substance",
    image: "https://images.unsplash.com/photo-1505686994434-e3cc5abf1330?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 8.3,
    year: 2024
  },
  {
    id: 12,
    title: "Terrifier 3",
    image: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 7.1,
    year: 2024
  },
  {
    id: 13,
    title: "Smile 2",
    image: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=400&h=600&fit=crop",
    quality: "4K",
    type: "Phim lẻ",
    rating: 7.4,
    year: 2024
  },
  {
    id: 14,
    title: "Red One",
    image: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 6.8,
    year: 2024
  },
  {
    id: 15,
    title: "Mufasa: The Lion King",
    image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&h=600&fit=crop",
    quality: "4K",
    type: "Phim lẻ",
    rating: 7.9,
    year: 2024
  },
  {
    id: 16,
    title: "Nosferatu",
    image: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 8.1,
    year: 2024
  },
  {
    id: 17,
    title: "Sonic the Hedgehog 3",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&h=600&fit=crop",
    quality: "HD",
    type: "Phim lẻ",
    rating: 7.7,
    year: 2024
  },
  {
    id: 18,
    title: "Kraven the Hunter",
    image: "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?w=400&h=600&fit=crop",
    quality: "4K",
    type: "Phim lẻ",
    rating: 6.9,
    year: 2024
  }
];
