import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface BookCoverProps {
  title: string;
  author?: string;
  coverImage?: string;
  isbn?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showShadow?: boolean;
}

export function BookCover({
  title,
  author,
  coverImage,
  isbn,
  className,
  size = 'md',
  showShadow = true,
}: BookCoverProps) {
  const [imageError, setImageError] = useState(false);

  // If coverImage is not provided but isbn is, use official bookstore image
  const resolvedImage = coverImage || (isbn ? `https://contents.kyobobook.co.kr/sih/fit-in/458x0/pdt/${isbn}.jpg` : undefined);
  const hasImage = resolvedImage && !imageError;

  return (
    <div
      className={cn(
        'aspect-[2/3] bg-gray-50 border border-gray-100 rounded-md overflow-hidden flex items-center justify-center relative select-none',
        showShadow && 'shadow-xs',
        className
      )}
    >
      {hasImage ? (
        <img
          src={resolvedImage}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center bg-gray-50">
          <span className="text-gray-400 text-xs tracking-wider break-keep font-medium leading-relaxed">
            {title}
          </span>
          {author && <span className="text-gray-300 text-[10px] mt-1 truncate max-w-[90%]">{author}</span>}
        </div>
      )}
    </div>
  );
}
