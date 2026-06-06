'use client'
import { Scan } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ScanButtonProps {
  onClick?: () => void
  className?: string
}

export function ScanButton({ onClick, className }: ScanButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative w-32 h-32 rounded-full',
        'bg-gradient-to-br from-accent/20 to-accent/5',
        'border-2 border-accent/50',
        'hover:border-accent',
        'hover:shadow-[0_0_30px_rgba(0,240,255,0.4)]',
        'transition-all duration-300 ease-out',
        'flex flex-col items-center justify-center',
        'shadow-lg shadow-black/30',
        className
      )}
    >
      <div className="absolute inset-0 rounded-full bg-accent/10 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      <Scan className="w-12 h-12 text-accent relative z-10" />
      <span className="text-accent text-sm font-medium mt-2 relative z-10">
        扫码录入
      </span>
    </button>
  )
}
