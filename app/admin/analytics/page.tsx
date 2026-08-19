'use client'

import { BarChart3, Clock3, Target } from 'lucide-react'

import { AnalyticsEmptyState } from '@/components/admin/analytics-empty-state'
import { ModelEvaluation, ModelEvaluationCard } from '@/components/admin/model-evaluation-card'
import { Card, CardContent } from '@/components/ui/card'

const pendingEvaluations: ModelEvaluation[] = [
  { name: 'Naive Seasonal', role: 'Reference baseline', status: 'pending' },
  { name: 'Linear Regression', role: 'Regression baseline', status: 'pending' },
  { name: 'XGBoost', role: 'Primary model', status: 'pending' },
]

export default function AdminAnalyticsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-[#a67c52]" />
            <h1 className="text-2xl font-black tracking-tight text-[#2c2825]">Model Evaluation & Traffic Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-[#9e9189]">Evaluation status and future traffic-performance analysis.</p>
        </div>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
          <Clock3 className="size-3.5" /> Evaluation pending
        </span>
      </header>

      <section aria-labelledby="evaluation-overview-heading">
        <div className="mb-3 flex items-center gap-2">
          <Target className="size-4 text-[#a67c52]" />
          <div>
            <h2 id="evaluation-overview-heading" className="font-extrabold text-[#2c2825]">Model evaluation overview</h2>
            <p className="text-xs text-[#9e9189]">Verified metrics will be supplied by the shared ML evaluation workflow.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {pendingEvaluations.map((evaluation) => <ModelEvaluationCard key={evaluation.name} evaluation={evaluation} />)}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div>
          <div className="mb-3">
            <h2 className="font-extrabold text-[#2c2825]">Model comparison</h2>
            <p className="text-xs text-[#9e9189]">MAE and RMSE comparison will appear after verified results are available.</p>
          </div>
          <AnalyticsEmptyState
            title="Comparison data pending"
            description="No verified MAE or RMSE values have been supplied. This visualization remains intentionally empty until the model evaluation contract is connected."
          />
        </div>
        <div>
          <div className="mb-3">
            <h2 className="font-extrabold text-[#2c2825]">Forecast analytics</h2>
            <p className="text-xs text-[#9e9189]">Actual-versus-predicted trends will be available with validated forecast observations.</p>
          </div>
          <AnalyticsEmptyState
            title="Forecast analysis pending"
            description="No verified actual or predicted time-series data is connected to this page yet. No chart points are shown until that source is approved."
          />
        </div>
      </section>

      <section aria-labelledby="methodology-heading">
        <Card className="border-[#e8e0d5] bg-white shadow-sm">
          <CardContent className="p-5">
            <h2 id="methodology-heading" className="font-extrabold text-[#2c2825]">Evaluation methodology</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 text-sm text-[#6b625b] md:grid-cols-2 xl:grid-cols-4">
              <MethodologyItem title="Time-based split" detail="Training and test data are separated chronologically to preserve the forecasting sequence." />
              <MethodologyItem title="MAE" detail="Mean Absolute Error measures the average magnitude of forecast error." />
              <MethodologyItem title="RMSE" detail="Root Mean Squared Error places greater weight on larger forecast errors." />
              <MethodologyItem title="Model comparison" detail="Naive Seasonal and Linear Regression baselines are compared with XGBoost, the intended primary model." />
            </div>
          </CardContent>
        </Card>
      </section>

      <div className="rounded-xl border border-dashed border-[#d8c9b7] bg-[#faf8f5] px-4 py-3 text-xs text-[#6b625b]">
        <span className="font-bold text-[#2c2825]">Data status.</span> This frontend is awaiting a team-approved evaluation source. Static prediction JSON is not used for model metrics.
      </div>
    </main>
  )
}

function MethodologyItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl bg-[#faf8f5] p-3">
      <h3 className="text-xs font-extrabold text-[#2c2825]">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed">{detail}</p>
    </div>
  )
}
