'use client'

import { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Send, Bot, User, Loader2, Zap } from 'lucide-react'

const AI_BACKEND = process.env.NEXT_PUBLIC_AI_BACKEND_URL || 'http://localhost:8000'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export function AICopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: '👋 **Hello Traffic Controller!** I am your AI Traffic Co-Pilot.\n\nAsk me anything about current telemetry, ML 15-minute forecasts, decision logs, or signal impact simulations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeSector, setActiveSector] = useState<{ lat: number; lon: number; name?: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadSector = () => {
      try {
        const stored = localStorage.getItem('planner_active_city')
        if (stored) setActiveSector(JSON.parse(stored))
      } catch (_) {}
    }
    loadSector()

    const handleCityChange = (e: any) => {
      if (e.detail) setActiveSector(e.detail)
    }
    window.addEventListener('planner_city_changed', handleCityChange)
    return () => window.removeEventListener('planner_city_changed', handleCityChange)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isOpen])

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim()
    if (!query || loading) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => [...prev, userMsg])
    if (!textToSend) setInput('')
    setLoading(true)

    try {
      const chatHistory = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await fetch(`${AI_BACKEND}/copilot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          lat: activeSector?.lat ?? 10.0601,
          lon: activeSector?.lon ?? 76.6214,
          city: activeSector?.name || 'Active Grid Sector',
        }),
      })

      const json = await res.json()
      if (json.success && json.data) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: json.data.reply || 'No response',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
        setMessages(prev => [...prev, botMsg])
      } else {
        throw new Error(json.message || 'Failed')
      }
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠ Could not reach AI backend. (${e.message})`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Co-Pilot Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full bg-emerald-600 px-5 py-3.5 text-sm font-bold text-white shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-emerald-700 border border-emerald-500 cursor-pointer shadow-emerald-500/30"
      >
        <div className="relative flex size-5 items-center justify-center">
          <span className="absolute size-5 animate-ping rounded-full bg-white opacity-40" />
          <Sparkles className="size-4 text-white" />
        </div>
        <span>AI Traffic Co-Pilot</span>
      </button>

      {/* Slide-over Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        />
      )}

      {/* Slide-over Drawer Panel */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md bg-slate-50 shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">AI Traffic Co-Pilot</h2>
              <p className="text-[11px] text-slate-500">
                {activeSector ? `Sector: ${activeSector.name || `${activeSector.lat.toFixed(4)}°, ${activeSector.lon.toFixed(4)}`}` : 'Live 10km Grid Telemetry'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-100 bg-slate-100/70 px-4 py-2.5 scrollbar-none">
          {[
            { label: '📊 Live Telemetry', prompt: 'Show live speed and congestion telemetry for current sector' },
            { label: '🔮 15-Min Forecast', prompt: 'Predict 15-minute congestion and delay' },
            { label: '📋 Decision Logs', prompt: 'What decisions were recorded recently in SQLite DB?' },
            { label: '⚡ Signal Simulation', prompt: 'Simulate extending green phase split by +30 seconds' },
          ].map(chip => (
            <button
              key={chip.label}
              onClick={() => handleSend(chip.prompt)}
              className="flex-shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-emerald-600 hover:border-emerald-600 hover:text-white transition-colors cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Chat transcript list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(m => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white mt-1 shadow-xs">
                  <Bot className="size-3.5" />
                </div>
              )}
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-tr-none shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none shadow-xs'
              }`}>
                <div className="whitespace-pre-wrap font-sans">{m.content}</div>
                <div className={`mt-1.5 text-[9px] ${m.role === 'user' ? 'text-emerald-100' : 'text-slate-400'}`}>
                  {m.timestamp}
                </div>
              </div>
              {m.role === 'user' && (
                <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white mt-1 shadow-xs">
                  <User className="size-3.5" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Bot className="size-3.5" />
              </div>
              <div className="rounded-2xl rounded-tl-none border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="size-3.5 animate-spin text-emerald-600" />
                <span>Executing OpenAI tool call & analyzing telemetry...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-slate-100 bg-white p-3">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSend()
            }}
            className="flex items-center gap-2"
          >
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask AI Co-Pilot about traffic, forecasts, SOPs..."
              className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex size-9 items-center justify-center rounded-xl bg-emerald-600 text-white transition-opacity disabled:opacity-40 hover:bg-emerald-700 cursor-pointer shadow-xs"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
