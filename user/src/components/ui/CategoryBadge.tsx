import React from 'react';

interface CategoryBadgeProps {
  category: string;
  onClick?: () => void;
  variant?: 'default' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ 
  category, 
  onClick,
  variant = 'default',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const variantClasses = {
    default: 'bg-orange-500 hover:bg-orange-600 text-white',
    outline: 'bg-transparent border border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white'
  };

  const baseClasses = 'rounded-full font-medium transition-colors cursor-pointer inline-block';

  return (
    <span
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`}
    >
      {category}
    </span>
  );
};

export default CategoryBadge;