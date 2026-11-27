import { cn } from '@/lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/assets/bookmoa-wordmark.webp"
      alt="BOOKMOA"
      width={600}
      height={131}
      className={cn('block h-auto max-w-full object-contain', className)}
    />
  );
}
