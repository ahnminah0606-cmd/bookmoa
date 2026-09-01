import { cn } from '@/lib/utils';

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/assets/bookmoa-logo.png"
      alt=""
      aria-hidden="true"
      className={cn('shrink-0 object-contain', className)}
    />
  );
}
