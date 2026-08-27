import type { ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva('inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e75f45]/40 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: {
      default: 'bg-[#e75f45] text-white hover:bg-[#d9533c]',
      dark: 'bg-[#252723] text-white hover:bg-[#3a3d36]',
      outline: 'border border-[#d2d2c9] bg-transparent text-[#242622] hover:bg-[#ecece6]',
      ghost: 'bg-transparent text-[#777970] hover:bg-[#ecece6] hover:text-[#242622]',
      danger: 'border border-[#eabbb0] bg-[#fff0ed] text-[#b04b39] hover:bg-[#fbe1dc]',
    },
    size: { default: 'text-sm', sm: 'min-h-9 px-3 text-xs', icon: 'h-10 w-10 p-0' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
}

export { buttonVariants }
