import { cva } from 'class-variance-authority'

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-sky-600',
        secondary: 'bg-white text-foreground border border-border hover:bg-muted',
        ghost: 'text-foreground hover:bg-accent hover:text-accent-foreground',
        danger: 'bg-rose-600 text-white hover:bg-rose-700',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ButtonVariant = NonNullable<Parameters<typeof buttonVariants>[0]>['variant']
export type ButtonSize = NonNullable<Parameters<typeof buttonVariants>[0]>['size']
