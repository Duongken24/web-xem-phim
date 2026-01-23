import React from 'react';
import { Film } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 border-t border-gray-800 mt-16">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-orange-500 p-2 rounded">
                <Film className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-orange-500">NiePhim</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Xem phim online miễn phí chất lượng cao với phụ đề tiếng Việt. 
              Cập nhật phim mới mỗi ngày.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Phim Hay</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Phim Chiếu Rạp</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Phim Lẻ Mới</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Phim Bộ Mới</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Phim Hoạt Hình</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-semibold mb-4">Thể Loại</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Hành Động</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Tâm Lý</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Hài Hước</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Kinh Dị</a></li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="text-white font-semibold mb-4">Thông Tin</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Giới Thiệu</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Liên Hệ</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Điều Khoản</a></li>
              <li><a href="#" className="text-gray-400 hover:text-orange-500 transition text-sm">Chính Sách</a></li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © 2025 NiePhim - Xem phim online miễn phí chất lượng cao. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;