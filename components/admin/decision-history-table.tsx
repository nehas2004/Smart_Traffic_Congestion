'use client'

import { useState } from 'react'
import { DecisionRecord, DecisionAction } from '@/types/traffic'
import { Card } from '@/components/ui/card'
import {
  CheckCircle2,
  Sliders,
  XCircle,
  Clock,
  User,
  Search,
  FileText,
  Filter,
} from 'lucide-react'

interface DecisionHistoryTableProps {
  decisions: DecisionRecord[]
}

export function DecisionHistoryTable({ decisions }: DecisionHistoryTableProps) {
  const [filterAction, setFilterAction] = useState<string>('all')
  const [searchCorridor, setSearchCorridor] = useState<string>('')

  const filtered = decisions.filter((d) => {
    const matchesAction = filterAction === 'all' || d.action === filterAction
    const matchesSearch =
      d.corridor_name.toLowerCase().includes(searchCorridor.toLowerCase()) ||
      d.operator.toLowerCase().includes(searchCorridor.toLowerCase()) ||
      (d.reason_or_notes && d.reason_or_notes.toLowerCase().includes(searchCorridor.toLowerCase()))
    return matchesAction && matchesSearch
  })

  function getActionBadge(action: DecisionAction) {
    switch (action) {
      case 'accept':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="size-3" /> Accepted
          </span>
        )
      case 'modify':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-700 border border-amber-200">
            <Sliders className="size-3" /> Modified
          </span>
        )
      case 'reject':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-rose-700 border border-rose-200">
            <XCircle className="size-3" /> Rejected
          </span>
        )
    }
  }

  function formatTime(iso: string) {
    try {
      const d = new Date(iso)
      return d.toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      {/* Search and Action Segment Control */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">
            Decision Support Audit Log
          </h2>
          <p className="text-[11px] text-slate-500">
            Full historical record of operator decisions dispatched to traffic controllers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Action Filter Pills */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {['all', 'accept', 'modify', 'reject'].map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setFilterAction(act)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold uppercase transition-all cursor-pointer ${
                  filterAction === act
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {act}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit log..."
              value={searchCorridor}
              onChange={(e) => setSearchCorridor(e.target.value)}
              className="h-8 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-emerald-500 shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* Decisions Audit Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-5 py-3">Timestamp</th>
              <th className="px-4 py-3">Target Corridor</th>
              <th className="px-4 py-3">Action Dispatched</th>
              <th className="px-4 py-3">Operator</th>
              <th className="px-4 py-3">Applied Parameters</th>
              <th className="px-5 py-3">Audit Notes & Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((record) => (
              <tr key={record.id} className="transition-colors hover:bg-slate-50/80">
                <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3 text-slate-400" />
                    {formatTime(record.timestamp)}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-bold text-slate-900">{record.corridor_name}</span>
                  <p className="font-mono text-[10px] text-slate-400">{record.corridor_id}</p>
                </td>
                <td className="px-4 py-3.5">{getActionBadge(record.action)}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <User className="size-3 text-slate-400" />
                    {record.operator}
                  </div>
                </td>
                <td className="px-4 py-3.5 font-mono text-[11px] text-slate-600">
                  {record.modified_parameters ? (
                    <div className="space-y-0.5">
                      {record.modified_parameters.custom_timing_seconds && (
                        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] mr-1 text-slate-700">
                          Offset: +{record.modified_parameters.custom_timing_seconds}s
                        </span>
                      )}
                      {record.modified_parameters.reroute_percentage && (
                        <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                          Divert: {record.modified_parameters.reroute_percentage}%
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">Standard config</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-slate-600">
                  <div className="flex items-start gap-1.5">
                    <FileText className="size-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="leading-snug">{record.reason_or_notes || '—'}</span>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                  No decision records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
