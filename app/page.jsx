'use client'

import { useState, useEffect } from 'react'
import MonitorForm from '@/components/MonitorForm'
import MonitorList from '@/components/MonitorList'

export default function Home() {
  const [monitors, setMonitors] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMonitors = async () => {
    setLoading(true)
    const res = await fetch('/api/monitors')
    const data = await res.json()
    setMonitors(data)
    setLoading(false)
  }

  useEffect(() => { fetchMonitors() }, [])

  const active = monitors.filter(m => m.status === 'active').length

  return (
    <main className="min-h-screen bg-[#0c0c0f]">
      <header className="border-b border-white/[0.06] px-6 py-4 sticky top-0 bg-[#0c0c0f]/80 backdrop-blur z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center text-xs">🎟</div>
            <span className="text-white font-semibold text-sm tracking-tight">멜론티켓 모니터</span>
          </div>
          {active > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot" />
              {active}개 모니터링 중
            </div>
          )}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        <MonitorForm onAdded={fetchMonitors} />
        <MonitorList monitors={monitors} loading={loading} onChanged={fetchMonitors} />
      </div>
    </main>
  )
}
