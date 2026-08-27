import type { InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn('flex h-11 w-full rounded-md border border-[#d8d9d0] bg-[#fbfbf9] px-3 text-sm text-[#242622] outline-none transition-colors placeholder:text-[#a0a29a] focus:border-[#e75f45] focus:ring-2 focus:ring-[#e75f45]/10 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} /> }
