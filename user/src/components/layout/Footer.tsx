import React, { useEffect, useState } from 'react';
import { Film } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCatalogGenres, getCatalogYears, type CatalogGenre } from '../../services/catalog-meta.service';

const footerLinkClass = 'text-sm text-gray-400 transition hover:text-orange-400';

const fallbackGenres: CatalogGenre[] = [
  { id: 28, name: 'Hanh Dong' },
  { id: 18, name: 'Tam Ly' },
  { id: 35, name: 'Hai Huoc' },
  { id: 27, name: 'Kinh Di' },
];

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [genres, setGenres] = useState<CatalogGenre[]>(fallbackGenres);
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([getCatalogGenres(), getCatalogYears()]).then(([genresResult, yearsResult]) => {
      if (!mounted) return;

      if (genresResult.status === 'fulfilled' && genresResult.value.length > 0) {
        setGenres(genresResult.value.slice(0, 10));
      }

      if (yearsResult.status === 'fulfilled' && yearsResult.value.length > 0) {
        setYears(yearsResult.value.slice(0, 8));
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const visibleYears = years.length > 0 ? years : Array.from({ length: 5 }, (_, index) => currentYear - index);

  return (
    <footer className="mt-16 border-t border-gray-800 bg-gray-900">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-5">
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
              <li><Link className={footerLinkClass} to="/movies?type=single">Phim le moi</Link></li>
              <li><Link className={footerLinkClass} to="/movies?type=series">Phim bo moi</Link></li>
              <li><Link className={footerLinkClass} to="/movies?trending=true">Phim dang noi</Link></li>
              <li><Link className={footerLinkClass} to="/movies?featured=true">Phim noi bat</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">The Loai</h4>
            <ul className="space-y-2">
              {genres.slice(0, 10).map((genre) => (
                <li key={genre.id}>
                  <Link className={footerLinkClass} to={`/genre/${genre.id}`}>
                    {genre.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Nam Phat Hanh</h4>
            <ul className="space-y-2">
              {visibleYears.slice(0, 8).map((year) => (
                <li key={year}>
                  <Link className={footerLinkClass} to={`/year/${year}`}>
                    {year}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold text-white">Danh Sach</h4>
            <ul className="space-y-2">
              <li><Link className={footerLinkClass} to="/watchlist">Danh sach cua toi</Link></li>
              <li><Link className={footerLinkClass} to="/history">Lich su xem</Link></li>
              <li><Link className={footerLinkClass} to="/about">Gioi Thieu</Link></li>
              <li><Link className={footerLinkClass} to="/contact">Lien He</Link></li>
              <li><Link className={footerLinkClass} to="/terms">Dieu Khoan</Link></li>
              <li><Link className={footerLinkClass} to="/privacy">Chinh Sach</Link></li>
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
