'use client'

import { useEffect, useState } from 'react'
import { DecisionHistoryTable } from '@/components/admin/decision-history-table'
import { fetchDecisionHistory } from '@/lib/admin-api'
import { DecisionRecord } from '@/types/traffic'
import { History, RefreshCw, ArrowLeft, Download, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

export default function AdminDecisionsPage() {
  const [decisions, setDecisions] = useState<DecisionRecord[]>([])
  const [loading, setLoading] = useState(true)

  async function loadData() {
    setLoading(true)
    try {
      const data = await fetchDecisionHistory()
      setDecisions(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function exportCSV() {
    const headers = ['ID', 'Corridor ID', 'Corridor Name', 'Action', 'Operator', 'Timestamp', 'Notes']
    const rows = decisions.map((d) => [
      d.id,
      d.corridor_id,
      `"${d.corridor_name}"`,
      d.action,
      `"${d.operator}"`,
      d.timestamp,
      `"${d.reason_or_notes || ''}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `traffic_decisions_audit_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const acceptedCount = decisions.filter((d) => d.action === 'accept').length
  const modifiedCount = decisions.filter((d) => d.action === 'modify').length
  const rejectedCount = decisions.filter((d) => d.action === 'reject').length

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="flex items-center gap-1 text-xs font-bold text-[#9e9189] hover:text-[#2c2825]"
            >
              <ArrowLeft className="size-3.5" /> Overview
            </Link>
            <span className="text-xs text-[#e8e0d5]">/</span>
            <span className="text-xs font-bold text-[#a67c52]">Operator Audit Trail</span>
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-[#2c2825]">
            Decision History & Compliance Log
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-[#e8e0d5] bg-white px-3.5 py-2 text-xs font-bold text-[#2c2825] shadow-sm hover:bg-[#faf8f5]"
          >
            <Download className="size-3.5 text-[#a67c52]" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl bg-[#2c2825] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#1e1b18]"
          >
            <RefreshCw className="size-3.5 text-[#c8a97e]" />
            Refresh Audit
          </button>
        </div>
      </div>

      {/* Summary Stat Counters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-[#e8e0d5] bg-white p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#9e9189]">
            Total Decisions Logged
          </span>
          <p className="mt-2 font-mono text-2xl font-black text-[#2c2825]">{decisions.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            Accepted Recommendations
          </span>
          <p className="mt-2 font-mono text-2xl font-black text-emerald-700">{acceptedCount}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
            Modified & Tuned
          </span>
          <p className="mt-2 font-mono text-2xl font-black text-amber-700">{modifiedCount}</p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
            Rejected
          </span>
          <p className="mt-2 font-mono text-2xl font-black text-rose-700">{rejectedCount}</p>
        </div>
      </div>

      {/* Audit Log Table */}
      <DecisionHistoryTable decisions={decisions} />
    </main>
  )
}
