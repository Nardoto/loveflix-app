import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest',
  {
    variants: {
      variant: {
        free: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-bg-deep shadow-md shadow-amber-500/40 font-extrabold',
        new: 'bg-rose/25 text-rose-bright',
        hot: 'bg-gradient-to-r from-red-600 via-orange-500 to-red-700 text-white animate-hot-glow',
        exclusive: 'bg-gold/20 text-gold-bright',
        comingSoon: 'bg-white/15 text-text-dim',
        genre: 'bg-rose-deep/20 text-rose-bright',
      },
    },
    defaultVariants: { variant: 'genre' },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export const Badge = ({ className, variant, ...props }: BadgeProps) => (
  <span className={cn(badgeVariants({ variant }), className)} {...props} />
);
