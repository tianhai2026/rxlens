import { cn } from '@/lib/utils'

interface SummaryCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  className?: string
}

export function SummaryCard({ title, value, icon, className }: SummaryCardProps) {
  return (
    <div
      className={cn(
        'bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border border-gray-800',
        'hover:border-accent/50 transition-all duration-300',
        'shadow-lg shadow-black/20',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-accent mt-1">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  )
}
