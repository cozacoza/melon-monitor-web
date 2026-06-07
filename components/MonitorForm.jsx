'use client'

import { useState } from 'react'

export default function MonitorForm({ onAdded }) {
  const [form, setForm] = useState({
    concert_url: '',
    discord_webhook: '',
    price_threshold: '',
    target_datetime: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.concert_url.includes('ticket.melon.com')) {
      setError('멜론티켓 URL을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          price_threshold: parseInt(form.price_threshold),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '등록 실패')
      setForm({ concert_url: '', discord_webhook: '', price_threshold: '', target_datetime: '' })
      onAdded()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <p className="text-white/30 text-xs font-medium uppercase tracking-widest mb-3">새 모니터링</p>
      <form onSubmit={handleSubmit} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 space-y-3">
        <div className="space-y-1">
          <label className="text-white/35 text-xs">멜론티켓 공연 URL *</label>
          <input
            value={form.concert_url} onChange={set('concert_url')} required
            placeholder="https://ticket.melon.com/performance/index.htm?prodId=..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500/40 transition-colors"
          />
        </div>

        <div className="space-y-1">
          <label className="text-white/35 text-xs">Discord 웹훅 URL *</label>
          <input
            value={form.discord_webhook} onChange={set('discord_webhook')} required
            placeholder="https://discord.com/api/webhooks/..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500/40 transition-colors"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-white/35 text-xs">기준 금액 이상 (원) *</label>
            <input
              type="number" value={form.price_threshold} onChange={set('price_threshold')} required
              placeholder="예: 150000"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500/40 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="text-white/35 text-xs">회차 날짜+시간 (선택)</label>
            <input
              value={form.target_datetime} onChange={set('target_datetime')}
              placeholder="예: 2026-06-10 19:30"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-rose-500/40 transition-colors"
            />
          </div>
        </div>

        {error && (
          <p className="text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-rose-500 to-orange-400 hover:opacity-90 disabled:opacity-40 text-white font-medium rounded-xl py-2.5 text-sm transition-opacity active:scale-[0.99]"
        >
          {loading ? '공연 정보 확인 중...' : '모니터링 시작'}
        </button>
      </form>
    </section>
  )
}
