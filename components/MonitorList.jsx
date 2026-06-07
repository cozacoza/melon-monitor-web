'use client'

import { useState } from 'react'

const STATUS_MAP = {
  active:  { label: '모니터링 중', color: 'text-emerald-400', dot: 'bg-emerald-400 pulse-dot' },
  paused:  { label: '일시정지',    color: 'text-yellow-400',  dot: 'bg-yellow-400' },
  alerted: { label: '알림 발송됨', color: 'text-blue-400',    dot: 'bg-blue-400' },
}

function MonitorCard({ monitor, onChanged }) {
  const [busy, setBusy] = useState(false)
  const s = STATUS_MAP[monitor.status] || STATUS_MAP.active

  const patch = async (payload) => {
    setBusy(true)
    await fetch(`/api/monitors/${monitor.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    await onChanged()
    setBusy(false)
  }

  const remove = async () => {
    if (!confirm('이 모니터링을 삭제할까요?')) return
    setBusy(true)
    await fetch(`/api/monitors/${monitor.id}`, { method: 'DELETE' })
    await onChanged()
  }

  const isActive = monitor.status === 'active'

  return (
    <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 space-y-3 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{monitor.concert_title || '공연명 로딩 중...'}</p>
          <p className="text-white/20 text-xs mt-0.5 truncate">{monitor.concert_url}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          <span className={`text-xs ${s.color}`}>{s.label}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Tag>💰 {monitor.price_threshold?.toLocaleString()}원 이상</Tag>
        {monitor.target_datetime && <Tag>🕐 {monitor.target_datetime}</Tag>}
        <Tag>🔔 Discord</Tag>
        {monitor.last_checked_at && (
          <Tag>✓ {new Date(monitor.last_checked_at).toLocaleString('ko-KR', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })}</Tag>
        )}
      </div>

      <div className="flex gap-2 pt-0.5">
        <button
          onClick={() => patch({ status: isActive ? 'paused' : 'active' })}
          disabled={busy}
          className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl py-1.5 text-xs text-white/50 hover:text-white/80 transition-all disabled:opacity-40"
        >
          {isActive ? '일시정지' : '재개'}
        </button>
        
          href={monitor.concert_url} target="_blank" rel="noopener noreferrer"
          className="flex-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl py-1.5 text-xs text-white/50 hover:text-white/80 transition-all text-center"
        >
          공연 페이지 →
        </a>
        <button
          onClick={remove} disabled={busy}
          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl px-3.5 py-1.5 text-xs text-rose-400 transition-all disabled:opacity-40"
        >
          삭제
        </button>
      </div>
    </div>
  )
}

function Tag({ children }) {
  return (
    <span className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-2.5 py-1 text-xs text-white/40">
      {children}
    </span>
  )
}

export default function MonitorList({ monitors, loading, onChanged }) {
  if (loading) return <div className="text-white/20 text-sm text-center py-12">불러오는 중...</div>

  if (monitors.length === 0) return (
    <div className="border border-dashed border-white/10 rounded-2xl py-16 text-center space-y-2">
      <p className="text-2xl">🎭</p>
      <p className="text-white/25 text-sm">등록된 모니터링이 없어요</p>
    </div>
  )

  return (
    <section className="space-y-3">
      <p className="text-white/30 text-xs font-medium uppercase tracking-widest">모니터링 목록 ({monitors.length})</p>
      {monitors.map(m => <MonitorCard key={m.id} monitor={m} onChanged={onChanged} />)}
    </section>
  )
}
