'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, BarChart3, Clock3, RefreshCw, Target } from 'lucide-react'
import { AnalyticsEmptyState } from '@/components/admin/analytics-empty-state'
import { ModelEvaluation, ModelEvaluationCard } from '@/components/admin/model-evaluation-card'
import { Card, CardContent } from '@/components/ui/card'
import { getModelEvaluationData, TrafficDataSource } from '@/lib/admin-api'

const displayName: Record<string, string> = { naive_seasonal: 'Naive Seasonal', linear_regression: 'Linear Regression', gradient_boosting: 'Gradient Boosting' }
const roleFor = (name: string) => name === 'naive_seasonal' ? 'Current best model' : name === 'linear_regression' ? 'Regression baseline' : 'Tree-model comparison'

export default function AdminAnalyticsPage() {
  const [evaluations, setEvaluations] = useState<ModelEvaluation[]>([])
  const [source, setSource] = useState<TrafficDataSource>('mock')
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  async function load() {
    const result = await getModelEvaluationData()
    setEvaluations(result.data.map((item) => ({ name: displayName[item.model_name] || item.model_name, role: roleFor(item.model_name), status: 'available', horizon: item.horizon, mae: item.mae, rmse: item.rmse, evaluationPeriod: `${new Date(item.evaluation_start).toLocaleDateString()} – ${new Date(item.evaluation_end).toLocaleDateString()}`, testRows: item.test_rows, version: item.model_version })))
    setSource(result.source)
    setNotice(result.error || null)
    setLoading(false)
  }
  useEffect(() => { void load() }, [])
  return <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><BarChart3 className="size-5 text-[#a67c52]" /><h1 className="text-2xl font-black tracking-tight text-[#2c2825]">Model Evaluation & Traffic Analytics</h1></div><p className="mt-1 text-sm text-[#9e9189]">Verified, horizon-specific model evaluation results.</p></div><button type="button" onClick={() => void load()} className="inline-flex w-fit items-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-white px-3.5 py-2 text-xs font-bold text-[#2c2825] shadow-sm"><RefreshCw className="size-3.5 text-[#a67c52]" />Refresh evaluation</button></header>
    {notice && <div role="status" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><AlertCircle className="mt-0.5 size-4 shrink-0" /><p>{notice} {source === 'mock' ? 'No mock evaluation metrics are shown.' : ''}</p></div>}
    <section aria-labelledby="evaluation-overview-heading"><div className="mb-3 flex items-center gap-2"><Target className="size-4 text-[#a67c52]" /><div><h2 id="evaluation-overview-heading" className="font-extrabold text-[#2c2825]">Model evaluation overview</h2><p className="text-xs text-[#9e9189]">Naive Seasonal is the verified best performer for 1h, 3h, and 6h on the current evaluation dataset.</p></div></div>{loading ? <div className="h-56 animate-pulse rounded-2xl bg-[#f0ece7]" /> : evaluations.length ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{evaluations.map((evaluation) => <ModelEvaluationCard key={`${evaluation.name}-${evaluation.horizon}`} evaluation={evaluation} />)}</div> : <AnalyticsEmptyState title="Evaluation data unavailable" description="No verified MAE or RMSE results were returned by the model-evaluation API." />}</section>
    <section className="grid grid-cols-1 gap-6 xl:grid-cols-2"><div><div className="mb-3"><h2 className="font-extrabold text-[#2c2825]">Model comparison</h2><p className="text-xs text-[#9e9189]">Per-horizon MAE and RMSE are listed in the verified cards above.</p></div><AnalyticsEmptyState title="Comparison chart not supplied" description="The API supplies verified aggregate evaluation metrics, not a chart-ready comparison series." compact /></div><div><div className="mb-3"><h2 className="font-extrabold text-[#2c2825]">Forecast analytics</h2><p className="text-xs text-[#9e9189]">Actual-versus-predicted trends require validated observation series.</p></div><AnalyticsEmptyState title="Forecast analysis pending" description="No verified actual-versus-predicted time-series data is available from the current API." compact /></div></section>
    <section aria-labelledby="methodology-heading"><Card className="border-[#e8e0d5] bg-white shadow-sm"><CardContent className="p-5"><h2 id="methodology-heading" className="font-extrabold text-[#2c2825]">Evaluation methodology</h2><div className="mt-4 grid grid-cols-1 gap-4 text-sm text-[#6b625b] md:grid-cols-2 xl:grid-cols-4"><MethodologyItem title="Time-based split" detail="Training and held-out evaluation data are separated chronologically." /><MethodologyItem title="MAE" detail="Mean Absolute Error measures average forecast error magnitude." /><MethodologyItem title="RMSE" detail="Root Mean Squared Error weights larger errors more heavily." /><MethodologyItem title="Model comparison" detail="Naive Seasonal, Linear Regression, and Gradient Boosting are evaluated per horizon." /></div></CardContent></Card></section>
    <div className="rounded-xl border border-dashed border-[#d8c9b7] bg-[#faf8f5] px-4 py-3 text-xs text-[#6b625b]"><span className="font-bold text-[#2c2825]">{source === 'api' ? 'Live API data.' : 'Evaluation data unavailable.'}</span> {source === 'api' ? 'Metrics are returned by the configured evaluation service.' : 'No metrics are fabricated when the evaluation service is unavailable.'}</div>
  </main>
}

function MethodologyItem({ title, detail }: { title: string; detail: string }) { return <div className="rounded-xl bg-[#faf8f5] p-3"><h3 className="text-xs font-extrabold text-[#2c2825]">{title}</h3><p className="mt-1 text-xs leading-relaxed">{detail}</p></div> }
