import type { SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={cn('flex h-11 w-full rounded-md border border-[#d8d9d0] bg-[#fbfbf9] px-3 text-sm text-[#242622] outline-none focus:border-[#e75f45] focus:ring-2 focus:ring-[#e75f45]/10', className)} {...props} /> }
