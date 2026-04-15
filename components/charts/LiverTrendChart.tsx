'use client'

import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  LineChart, Line,
} from 'recharts'

interface HistoryRow {
  period: string
  diamonds: number
  pk_diamonds: number
  live_count: number
  valid_live_days: number
  pk_count: number
}

interface Props {
  data: HistoryRow[]
  activeTab: string
}

function fmtLabel(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

export function DiamondTrendChart({ data }: { data: HistoryRow[] }) {
  const chartData = data.map((r) => {
    const pk = r.pk_diamonds ?? 0
    const other = Math.max((r.diamonds ?? 0) - pk, 0)
    return { period: r.period, 通常ダイヤ: other, PKダイヤ: pk, total: r.diamonds ?? 0 }
  })
  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtLabel} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip formatter={(v) => [fmtLabel(Number(v)), '']} />
        <Legend iconSize={12} />
        <Bar dataKey="通常ダイヤ" stackId="a" fill="#fe2c55" />
        <Bar dataKey="PKダイヤ" stackId="a" fill="#ff9500" radius={[3, 3, 0, 0]} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function ActivityTrendChart({ data }: { data: HistoryRow[] }) {
  const chartData = data.map((r) => ({
    period: r.period,
    LIVE回数: r.live_count ?? 0,
    有効配信日数: r.valid_live_days ?? 0,
    PK回数: r.pk_count ?? 0,
  }))
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip />
        <Legend iconSize={12} />
        <Line dataKey="LIVE回数" stroke="#fe2c55" strokeWidth={2} dot={{ r: 4 }} />
        <Line dataKey="有効配信日数" stroke="#2196f3" strokeWidth={2} dot={{ r: 4 }} />
        <Line dataKey="PK回数" stroke="#ff9500" strokeWidth={2} dot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}
