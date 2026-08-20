import { BarChart3, Clock3 } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

interface AnalyticsEmptyStateProps {
  title: string
  description: string
  compact?: boolean
}

export function AnalyticsEmptyState({ title, description, compact = false }: AnalyticsEmptyStateProps) {
  return (
    <Card className={`border-dashed border-[#d8c9b7] bg-[#faf8f5] shadow-none ${compact ? 'p-5' : 'p-8'}`}>
      <CardContent className="flex flex-col items-center p-0 text-center">
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#a67c52]/10 text-[#a67c52]">
          {compact ? <Clock3 className="size-5" /> : <BarChart3 className="size-5" />}
        </div>
        <h3 className="mt-3 font-extrabold text-[#2c2825]">{title}</h3>
        <p className="mt-1 max-w-md text-sm text-[#6b625b]">{description}</p>
      </CardContent>
    </Card>
  )
}
