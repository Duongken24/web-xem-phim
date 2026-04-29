import React from 'react';
import { Film } from 'lucide-react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-gray-800 bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded bg-orange-500 p-2">
                <Film className="h-5 w-5" />
              </div>
              <h3 className="text-xl font-bold text-orange-500">Them Phim</h3>
            </div>
            <p className="text-sm text-gray-400">
              Xem phim online mien phi chat luong cao voi phu de tieng Viet.
              Cap nhat phim moi moi ngay.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Phim Hay</h4>
            <ul className="space-y-2">
              <li><span className="text-sm text-gray-400">Phim Chieu Rap</span></li>
              <li><span className="text-sm text-gray-400">Phim Le Moi</span></li>
              <li><span className="text-sm text-gray-400">Phim Bo Moi</span></li>
              <li><span className="text-sm text-gray-400">Phim Hoat Hinh</span></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">The Loai</h4>
            <ul className="space-y-2">
              <li><span className="text-sm text-gray-400">Hanh Dong</span></li>
              <li><span className="text-sm text-gray-400">Tam Ly</span></li>
              <li><span className="text-sm text-gray-400">Hai Huoc</span></li>
              <li><span className="text-sm text-gray-400">Kinh Di</span></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Thong Tin</h4>
            <ul className="space-y-2">
              <li><span className="text-sm text-gray-400">Gioi Thieu</span></li>
              <li><span className="text-sm text-gray-400">Lien He</span></li>
              <li><span className="text-sm text-gray-400">Dieu Khoan</span></li>
              <li><span className="text-sm text-gray-400">Chinh Sach</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-400">
            © {currentYear} Them Phim - Xem phim online mien phi chat luong cao. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
