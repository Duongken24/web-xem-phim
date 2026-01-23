import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  showHomeIcon?: boolean;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items, showHomeIcon = true }) => {
  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      {showHomeIcon && (
        <>
          <a href="/" className="text-gray-400 hover:text-orange-500 transition">
            <Home className="w-4 h-4" />
          </a>
          {items.length > 0 && <ChevronRight className="w-4 h-4 text-gray-600" />}
        </>
      )}
      
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            {item.href && !isLast ? (
              <a
                href={item.href}
                className="text-gray-400 hover:text-orange-500 transition"
              >
                {item.label}
              </a>
            ) : (
              <span className={isLast ? 'text-white font-medium' : 'text-gray-400'}>
                {item.label}
              </span>
            )}
            
            {!isLast && <ChevronRight className="w-4 h-4 text-gray-600" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;