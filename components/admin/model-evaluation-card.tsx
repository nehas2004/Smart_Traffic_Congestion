import { CheckCircle2, Clock3 } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'

export type EvaluationStatus = 'pending' | 'available'

export interface ModelEvaluation {
  name: string
  role: string
  status: EvaluationStatus
  mae?: number
  rmse?: number
  horizon?: '1h' | '3h' | '6h'
  evaluationPeriod?: string
  testRows?: number
  version?: string
}

interface ModelEvaluationCardProps {
  evaluation: ModelEvaluation
}

function MetricValue({ value }: { value?: number }) {
  return (
    <span className="font-mono text-sm font-extrabold text-[#2c2825]">
      {value == null ? 'Not yet evaluated' : value}
    </span>
  )
}

export function ModelEvaluationCard({ evaluation }: ModelEvaluationCardProps) {
  const available = evaluation.status === 'available'

  return (
    <Card className="border-[#e8e0d5] bg-white p-5 shadow-sm">
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">{evaluation.role}</p>
            <h2 className="mt-1 text-base font-extrabold text-[#2c2825]">{evaluation.name}</h2>
            {evaluation.horizon && <p className="mt-1 font-mono text-xs font-bold text-[#a67c52]">{evaluation.horizon} horizon</p>}
          </div>
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
            available ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
          }`}>
            {available ? <CheckCircle2 className="size-3" /> : <Clock3 className="size-3" />}
            {available ? 'Evaluated' : 'Evaluation pending'}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-y border-[#f0ece7] py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189]">MAE</p>
            <div className="mt-1"><MetricValue value={evaluation.mae} /></div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9e9189]">RMSE</p>
            <div className="mt-1"><MetricValue value={evaluation.rmse} /></div>
          </div>
        </div>

        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex justify-between gap-4">
            <dt className="text-[#9e9189]">Evaluation period</dt>
            <dd className="font-medium text-[#2c2825]">{evaluation.evaluationPeriod || 'Not yet evaluated'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#9e9189]">Test rows</dt>
            <dd className="font-medium text-[#2c2825]">{evaluation.testRows?.toLocaleString() || 'Not yet available'}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[#9e9189]">Model version</dt>
            <dd className="font-medium text-[#2c2825]">{evaluation.version || 'Not yet available'}</dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  )
}
