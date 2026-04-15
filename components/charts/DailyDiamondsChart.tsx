'use client'

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

interface DailyData {
  day: number
  diamonds: number
}

interface Props {
  currentData: DailyData[]
  prevData: DailyData[]
  currentPeriod: string
  prevPeriod: string
}

function fmtDiamond(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1000).toFixed(1)}k`
  return String(v)
}

export default function DailyDiamondsChart({ currentData, prevData, currentPeriod, prevPeriod }: Props) {
  // 1〜31 の日付軸を作成
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const data = days.map((day) => ({
    day,
    current: currentData.find((d) => d.day === day)?.diamonds ?? null,
    prev: prevData.find((d) => d.day === day)?.diamonds ?? null,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={fmtDiamond} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(v) => [fmtDiamond(Number(v)), '']}
          labelFormatter={(l) => `${l}日`}
        />
        <Legend
          formatter={(v) => v === 'current' ? `${currentPeriod}（今月）` : `${prevPeriod}（前月）`}
          iconSize={12}
        />
        <Bar dataKey="current" fill="#fe2c55" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Line
          dataKey="prev"
          stroke="#aaa"
          strokeWidth={2}
          strokeDasharray="4 2"
          dot={{ r: 3, fill: '#aaa' }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
